import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const dir = process.cwd();
const types = { '.html':'text/html; charset=utf-8', '.json':'application/json', '.csv':'text/csv', '.js':'text/javascript' };

// ── 인증: 콘솔 API 키(env) 또는 ant CLI OAuth 토큰(Claude 로그인) 자동 감지 ──
function getAuth() {
  if (process.env.ANTHROPIC_API_KEY) return { type: 'apikey', key: process.env.ANTHROPIC_API_KEY };
  try {
    const r = spawnSync('ant', ['auth', 'print-credentials', '--access-token'], { encoding: 'utf8', shell: true });
    if (!r.error && r.status === 0 && r.stdout && r.stdout.trim()) return { type: 'oauth', token: r.stdout.trim() };
  } catch {}
  return null;
}

const SETUP_MSG =
`AI 풀이를 사용하려면 서버에 인증이 필요합니다. 다음 중 하나를 준비한 뒤 서버를 다시 실행하세요.

[방법 A] 콘솔 API 키 (사용량만큼 과금)
  1) https://platform.claude.com 에서 API 키 발급
  2) PowerShell에서:
       $env:ANTHROPIC_API_KEY="sk-ant-..."; node server.mjs

[방법 B] Claude 로그인 사용 (별도 유료 키 불필요)
  1) ant CLI 설치 후:  ant auth login
  2) 로그인 완료 후:    node server.mjs

준비되면 이 버튼을 다시 눌러 주세요.`;

const SYSTEM_PROMPT =
`당신은 한국 전통 명리학(사주팔자)에 정통한, 따뜻하고 신중한 상담가입니다. 제공된 사주 명식(明式) 데이터를 바탕으로 개인 맞춤 풀이를 한국어로 작성하세요.

다음 순서로 마크다운 소제목(##)과 문단으로 읽기 좋게 구성하세요:
1. 타고난 성정과 기질 (일간·격국 중심)
2. 강점과 재능
3. 주의하면 좋은 점
4. 직업운
5. 재물·투자운 (재성·식상·용신 흐름으로 본 재물 성향과 유의점)
6. 대인관계·애정운
7. 건강
8. 대운의 흐름과 앞으로의 조언

원칙:
- 단정적 예언이나 미신적 공포 조장은 피하고, 가능성과 경향으로 서술합니다.
- 명리 용어는 쉽게 풀어 설명합니다.
- 사람의 자유의지와 노력으로 얼마든지 달라질 수 있음을 강조합니다.
- 의료·법률·재무의 구체적 결정은 전문가 상담을 권합니다.
- 재물·투자운은 사주 재성·식상·용신 관점의 성향과 시기 흐름을 '참고'로만 제시합니다. 특정 종목·자산·매매 시점을 추천하지 말고, 지나친 욕심·손절 기준·분산 같은 태도 조언 위주로 씁니다. 이 부분은 명리학 기반 참고일 뿐 투자 자문이 아니며, 실제 판단과 손익 책임은 본인에게 있음을 이 섹션 안에서 자연스럽게 밝히세요.
- 따뜻하고 격려하는 어조로, 전체 1000~1500자 내외.`;

async function callAI(sajuText, res) {
  const auth = getAuth();
  if (!auth) { res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end(SETUP_MSG); return; }
  const headers = { 'anthropic-version': '2023-06-01', 'content-type': 'application/json' };
  if (auth.type === 'apikey') headers['x-api-key'] = auth.key;
  else { headers['authorization'] = 'Bearer ' + auth.token; headers['anthropic-beta'] = 'oauth-2025-04-20'; }

  const body = {
    model: 'claude-opus-4-8',
    max_tokens: 4096,
    stream: true,
    output_config: { effort: 'medium' },
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content:
      '다음은 상담자의 사주 명식입니다.\n\n' + sajuText +
      '\n\n위 명식을 종합하여, 따뜻하고 통찰력 있는 사주 풀이를 작성해 주세요.' }],
  };

  let apiRes;
  try {
    apiRes = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers, body: JSON.stringify(body) });
  } catch (e) {
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('API 연결 실패: ' + e.message); return;
  }
  if (!apiRes.ok) {
    const t = await apiRes.text();
    let msg;
    if (t.includes('credit balance')) {
      msg = 'Anthropic API 크레딧이 부족합니다.\n\n' +
        'platform.claude.com → Plans & Billing 에서 크레딧을 구매(최소 $5)하면\n' +
        '서버 재시작 없이 바로 사용할 수 있습니다.\n' +
        '(사주 풀이 1회 ≈ 수십 원, $5로 약 100~200회 분량)';
    } else if (apiRes.status === 401 || apiRes.status === 403) {
      msg = '인증 오류(' + apiRes.status + ').\nant auth login 을 다시 하거나 ANTHROPIC_API_KEY 를 확인하세요.\n\n' + t.slice(0, 300);
    } else {
      msg = 'API 오류 ' + apiRes.status + ': ' + t.slice(0, 600);
    }
    res.writeHead(apiRes.status, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(msg); return;
  }
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' });
  let buf = '';
  for await (const chunk of apiRes.body) {
    buf += Buffer.from(chunk).toString('utf8');
    let idx;
    while ((idx = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, idx); buf = buf.slice(idx + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      try {
        const ev = JSON.parse(data);
        if (ev.type === 'content_block_delta' && ev.delta && ev.delta.type === 'text_delta') res.write(ev.delta.text);
        else if (ev.type === 'error') res.write('\n[오류: ' + (ev.error && ev.error.message || '알 수 없음') + ']');
      } catch {}
    }
  }
  res.end();
}

createServer(async (req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  // AI 프록시
  if (req.method === 'POST' && p === '/api/ai') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on('end', async () => {
      let saju = '';
      try { saju = (JSON.parse(body).saju || '').toString(); } catch {}
      try { await callAI(saju, res); }
      catch (e) { if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('서버 오류: ' + e.message); }
    });
    return;
  }
  // 정적 파일
  try {
    let path = p === '/' ? '/사주.html' : p;
    const buf = await readFile(join(dir, path));
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream' });
    res.end(buf);
  } catch { res.writeHead(404); res.end('not found'); }
}).listen(8123, () => console.log('http://localhost:8123/'));
