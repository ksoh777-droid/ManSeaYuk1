// 라이브러리 버그(주로 12-31)로 튀는 년주/월주 1일 스파이크 교정
import { readFileSync, writeFileSync } from 'node:fs';

const GAN = ['갑','을','병','정','무','기','경','신','임','계'];
const JI  = ['자','축','인','묘','진','사','오','미','신','유','술','해'];
const GAN_H = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const JI_H  = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const hangulOf = (id) => GAN[id % 10] + JI[id % 12];
const hanjaOf  = (id) => GAN_H[id % 10] + JI_H[id % 12];
const idOf = (p) => { for (let i=0;i<60;i++) if (hangulOf(i)===p) return i; return -1; };

const rows = JSON.parse(readFileSync('manseryeok_1900_2050.json','utf8'));

function repair(field, hanjaField) {
  const fixes = [];
  for (let i = 1; i < rows.length - 1; i++) {
    const prev = idOf(rows[i-1][field]);
    const cur  = idOf(rows[i][field]);
    const next = idOf(rows[i+1][field]);
    // 양옆이 같은데 가운데만 다른 1일 스파이크 = 글리치
    if (prev === next && cur !== prev) {
      fixes.push({ date: rows[i].solar_date, from: rows[i][field], to: hangulOf(prev) });
      rows[i][field] = hangulOf(prev);
      rows[i][hanjaField] = hanjaOf(prev);
    }
  }
  return fixes;
}

const yFixes = repair('year_pillar', 'year_pillar_hanja');
const mFixes = repair('month_pillar', 'month_pillar_hanja');

console.log(`년주 교정: ${yFixes.length}건`);
yFixes.slice(0,50).forEach(f => console.log(`  ${f.date}: ${f.from} -> ${f.to}`));
console.log(`월주 교정: ${mFixes.length}건`);
mFixes.slice(0,50).forEach(f => console.log(`  ${f.date}: ${f.from} -> ${f.to}`));

// 교정 대상 날짜 분포(월-일)
const dates = [...new Set([...yFixes, ...mFixes].map(f => f.date))].sort();
const notDec31 = dates.filter(d => !d.endsWith('-12-31'));
console.log(`교정된 고유 날짜 ${dates.length}개, 12-31이 아닌 날: ${notDec31.length}개`, notDec31);

// 저장
writeFileSync('manseryeok_1900_2050.json', JSON.stringify(rows), 'utf8');
const headers = Object.keys(rows[0]);
const esc = (v)=>{const s=String(v);return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;};
const lines = [headers.join(',')];
for (const r of rows) lines.push(headers.map(h=>esc(r[h])).join(','));
writeFileSync('manseryeok_1900_2050.csv', '﻿' + lines.join('\r\n'), 'utf8');
console.log('교정된 JSON/CSV 재저장 완료');
