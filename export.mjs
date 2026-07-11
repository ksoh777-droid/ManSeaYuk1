// 만세력 전체 데이터(1900~2050) CSV + JSON 추출 스크립트
import { solarToLunar, getSupportedRange } from '@fullstackfamily/manseryeok';
import { writeFileSync } from 'node:fs';

const { min, max } = getSupportedRange(); // { min: 1900, max: 2050 }
console.log(`추출 범위: ${min}-01-01 ~ ${max}-12-31`);

const pad = (n) => String(n).padStart(2, '0');
const daysInMonth = (y, m) => new Date(y, m, 0).getDate(); // m: 1~12

const rows = [];
let errors = 0;

for (let y = min; y <= max; y++) {
  for (let m = 1; m <= 12; m++) {
    const dim = daysInMonth(y, m);
    for (let d = 1; d <= dim; d++) {
      try {
        const r = solarToLunar(y, m, d);
        rows.push({
          solar_date: `${y}-${pad(m)}-${pad(d)}`,
          solar_year: y,
          solar_month: m,
          solar_day: d,
          lunar_year: r.lunar.year,
          lunar_month: r.lunar.month,
          lunar_day: r.lunar.day,
          is_leap_month: r.lunar.isLeapMonth,
          year_pillar: r.gapja.yearPillar,
          year_pillar_hanja: r.gapja.yearPillarHanja,
          month_pillar: r.gapja.monthPillar,
          month_pillar_hanja: r.gapja.monthPillarHanja,
          day_pillar: r.gapja.dayPillar,
          day_pillar_hanja: r.gapja.dayPillarHanja,
          julian_day: r.julianDay,
        });
      } catch (e) {
        errors++;
        if (errors <= 5) console.warn(`  건너뜀 ${y}-${pad(m)}-${pad(d)}: ${e.message}`);
      }
    }
  }
  if (y % 20 === 0) console.log(`  ...${y}년 처리 중 (누적 ${rows.length}행)`);
}

console.log(`총 ${rows.length}행 생성, 오류/건너뜀 ${errors}건`);

// --- JSON 저장 ---
writeFileSync('manseryeok_1900_2050.json', JSON.stringify(rows), 'utf8');
console.log('저장: manseryeok_1900_2050.json');

// --- CSV 저장 (엑셀 호환용 UTF-8 BOM 포함) ---
const headers = Object.keys(rows[0]);
const esc = (v) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const lines = [headers.join(',')];
for (const row of rows) lines.push(headers.map((h) => esc(row[h])).join(','));
writeFileSync('manseryeok_1900_2050.csv', '﻿' + lines.join('\r\n'), 'utf8');
console.log('저장: manseryeok_1900_2050.csv');
