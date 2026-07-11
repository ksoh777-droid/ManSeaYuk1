// 누락된 1956-12-31 한 줄을 정확히 계산해 채워넣고 CSV/JSON 재저장
import { solarToLunar, SIXTY_PILLARS, getPillarByHangul } from '@fullstackfamily/manseryeok';
import { readFileSync, writeFileSync } from 'node:fs';

// 60갑자에서 다음 간지 구하기 (id 0~59, combined.hangul/hanja 구조)
function nextPillar(hangul) {
  const p = getPillarByHangul(hangul);          // { id, combined:{hangul,hanja} }
  const next = SIXTY_PILLARS[(p.id + 1) % 60];
  return { hangul: next.combined.hangul, hanja: next.combined.hanja };
}

const prev = solarToLunar(1956, 12, 30);      // 음력 11/29, 일주 신미
const nextDayPillar = nextPillar(prev.gapja.dayPillar); // 신미 -> 임신

const missing = {
  solar_date: '1956-12-31',
  solar_year: 1956,
  solar_month: 12,
  solar_day: 31,
  lunar_year: 1956,
  lunar_month: 11,
  lunar_day: 30,          // 11/29 다음날 = 11/30 (음력 11월은 30일까지)
  is_leap_month: false,
  year_pillar: prev.gapja.yearPillar,          // 병신 (연주는 입춘 기준, 12월말은 동일)
  year_pillar_hanja: prev.gapja.yearPillarHanja,
  month_pillar: prev.gapja.monthPillar,        // 절기 경계 없음 -> 12/30과 동일
  month_pillar_hanja: prev.gapja.monthPillarHanja,
  day_pillar: nextDayPillar.hangul,            // 임신
  day_pillar_hanja: nextDayPillar.hanja,
  julian_day: prev.julianDay + 1,
};

console.log('채워넣을 행:', JSON.stringify(missing, null, 2));

// JSON 로드 후 올바른 위치(1957-01-01 앞)에 삽입
const rows = JSON.parse(readFileSync('manseryeok_1900_2050.json', 'utf8'));
const already = rows.some((r) => r.solar_date === '1956-12-31');
if (already) {
  console.log('이미 존재 -> 삽입 생략');
} else {
  const at = rows.findIndex((r) => r.solar_date === '1957-01-01');
  rows.splice(at, 0, missing);
  console.log(`삽입 완료. 총 ${rows.length}행`);
}

// 재저장
writeFileSync('manseryeok_1900_2050.json', JSON.stringify(rows), 'utf8');

const headers = Object.keys(rows[0]);
const esc = (v) => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const lines = [headers.join(',')];
for (const row of rows) lines.push(headers.map((h) => esc(row[h])).join(','));
writeFileSync('manseryeok_1900_2050.csv', '﻿' + lines.join('\r\n'), 'utf8');
console.log('CSV/JSON 재저장 완료');
