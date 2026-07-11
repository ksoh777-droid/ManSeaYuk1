// 템플릿 HTML에 web_data.json을 주입해 자체완결형 사주.html 생성
import { readFileSync, writeFileSync } from 'node:fs';

const tpl = readFileSync('saju.template.html', 'utf8');
const data = readFileSync('web_data.json', 'utf8'); // 압축 JSON 한 줄
const h2c = readFileSync('node_modules/html2canvas/dist/html2canvas.min.js', 'utf8');

let out = tpl.replace('/*__WEB_DATA__*/ null /*__END__*/', data);
if (out === tpl) { console.error('❌ 주입 실패: WEB_DATA 플레이스홀더 없음'); process.exit(1); }
const before = out;
out = out.replace('/*__HTML2CANVAS__*/', () => h2c);
if (out === before) { console.error('❌ 주입 실패: HTML2CANVAS 플레이스홀더 없음'); process.exit(1); }
writeFileSync('사주.html', out, 'utf8');
writeFileSync('index.html', out, 'utf8'); // GitHub Pages 공개용 (동일 내용, ASCII 파일명)
console.log(`사주.html + index.html 생성 완료 (${(out.length/1024).toFixed(0)} KB, 데이터+html2canvas 내장)`);
