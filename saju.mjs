// 사주 조회 프로그램
// 사용법:
//   node saju.mjs 1990-05-15 14:30            (양력 생년월일 시각)
//   node saju.mjs 1990-05-15 14:30 --correct  (동경135도 30분 보정)
//   node saju.mjs                             (대화형 입력)
import { getHourPillar } from './hour_pillar.mjs';
import { getPillarByHangul } from '@fullstackfamily/manseryeok';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import readline from 'node:readline';

const __dir = dirname(fileURLToPath(import.meta.url));
const DATA = JSON.parse(readFileSync(join(__dir, 'manseryeok_1900_2050.json'), 'utf8'));

// 오행별 색/한자
const OHAENG_HANJA = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' };

// 간지 한글 -> { 천간오행, 지지오행, 띠, 음양, 한자 }
function decompose(pillarHangul) {
  const p = getPillarByHangul(pillarHangul);
  return {
    hangul: p.combined.hangul,
    hanja: p.combined.hanja,
    ganElement: p.tiangan.element,   // 천간 오행
    jiElement: p.dizhi.element,      // 지지 오행
    animal: p.dizhi.animal,          // 띠
    yinYang: p.yinYang,
  };
}

function lookup(dateStr, hour, minute, correct) {
  const day = DATA.find((r) => r.solar_date === dateStr);
  if (!day) throw new Error(`지원 범위(1900~2050) 밖이거나 잘못된 날짜: ${dateStr}`);
  const dayStem = day.day_pillar[0];
  const siju = getHourPillar(dayStem, hour, minute, { longitudeCorrection: correct });

  const pillars = {
    시주: siju.pillar,
    일주: day.day_pillar,
    월주: day.month_pillar,
    년주: day.year_pillar,
  };
  return { day, siju, pillars };
}

function render(dateStr, hour, minute, correct) {
  const { day, siju, pillars } = lookup(dateStr, hour, minute, correct);
  const order = ['시주', '일주', '월주', '년주'];
  const dec = Object.fromEntries(order.map((k) => [k, decompose(pillars[k])]));

  const hh = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  const line = '─'.repeat(45);

  const out = [];
  out.push('');
  out.push('╔' + '═'.repeat(45) + '╗');
  out.push('║  🔮  사 주 팔 자 (四柱八字)' + ' '.repeat(21) + '║');
  out.push('╚' + '═'.repeat(45) + '╝');
  out.push(`  양력 : ${dateStr} ${hh}:${mm}` + (correct ? '  (동경135도 -30분 보정)' : ''));
  out.push(`  음력 : ${day.lunar_year}년 ${day.lunar_month}월 ${day.lunar_day}일` +
           (day.is_leap_month ? ' (윤달)' : '') + `   ·   시지: ${siju.hourBranch}시(${siju.range})`);
  out.push(`  띠   : ${decompose(day.year_pillar).animal}띠`);
  out.push(line);
  // 표: 시 일 월 년
  out.push('        시주      일주      월주      년주');
  const rowHanja = order.map((k) => ` ${dec[k].hanja} `).map(pad9).join('');
  const rowHangul = order.map((k) => ` ${dec[k].hangul} `).map(pad9).join('');
  out.push('  한글 ' + rowHangul);
  out.push('  한자 ' + rowHanja);
  // 오행 (천간/지지)
  const rowGan = order.map((k) => `${dec[k].ganElement}(${OHAENG_HANJA[dec[k].ganElement]})`).map(pad9).join('');
  const rowJi = order.map((k) => `${dec[k].jiElement}(${OHAENG_HANJA[dec[k].jiElement]})`).map(pad9).join('');
  out.push('  천간 ' + rowGan);
  out.push('  지지 ' + rowJi);
  out.push(line);

  // 오행 분포 통계 (천간+지지 8글자)
  const count = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const k of order) { count[dec[k].ganElement]++; count[dec[k].jiElement]++; }
  const stat = Object.entries(count)
    .map(([e, n]) => `${e}${OHAENG_HANJA[e]} ${n}`)
    .join('   ');
  out.push('  오행 분포 : ' + stat);
  // 일간(나 자신) 강조
  out.push(`  일간(日干·나) : ${day.day_pillar[0]} (${dec['일주'].ganElement}${OHAENG_HANJA[dec['일주'].ganElement]})`);
  out.push('');
  return out.join('\n');
}

function pad9(s) {
  // 한글/한자 폭 고려한 대략적 정렬(고정폭 콘솔 기준)
  const w = [...s].reduce((a, c) => a + (c.charCodeAt(0) > 127 ? 2 : 1), 0);
  return s + ' '.repeat(Math.max(0, 10 - w));
}

// ── 입력 처리 ─────────────────────────────
function parseAndRun(dateStr, timeStr, correct) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) throw new Error('날짜 형식은 YYYY-MM-DD 여야 합니다.');
  const [h, m] = (timeStr || '00:00').split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59)
    throw new Error('시각 형식은 HH:MM (00:00~23:59) 여야 합니다.');
  console.log(render(dateStr, h, m, correct));
}

const args = process.argv.slice(2);
const correct = args.includes('--correct');
const positional = args.filter((a) => !a.startsWith('--'));

if (positional.length >= 1) {
  try { parseAndRun(positional[0], positional[1] || '00:00', correct); }
  catch (e) { console.error('❌ ' + e.message); process.exit(1); }
} else {
  // 대화형
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((res) => rl.question(q, res));
  (async () => {
    try {
      console.log('\n=== 사주 조회 ===');
      const d = await ask('생년월일 (예: 1990-05-15) : ');
      const t = await ask('태어난 시각 (예: 14:30, 모르면 Enter) : ');
      const c = (await ask('한국 표준시 30분 보정할까요? (y/N) : ')).trim().toLowerCase() === 'y';
      parseAndRun(d.trim(), t.trim() || '00:00', c);
    } catch (e) {
      console.error('❌ ' + e.message);
    } finally {
      rl.close();
    }
  })();
}
