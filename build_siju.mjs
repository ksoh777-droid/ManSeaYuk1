// 시주 조견표 CSV 생성 + 검증 + 실제 만세력 데이터와 결합 예시
import { getHourPillar, TIANGAN, DIZHI, HOUR_RANGES } from './hour_pillar.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

// 각 시지의 대표 시각(정중앙)으로 조견표 계산
const branchSampleHour = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]; // 자~해 대표 시

// 1) 시주 조견표: 행=일간(10), 열=시지(12)
const header = ['일간(日干)', ...HOUR_RANGES.map(([b, r]) => `${b}시(${r})`)];
const lines = [header.join(',')];
for (const stem of TIANGAN) {
  const cells = [stem];
  for (let i = 0; i < 12; i++) {
    const h = getHourPillar(stem, branchSampleHour[i], 0);
    cells.push(`${h.pillar}(${h.pillarHanja})`);
  }
  lines.push(cells.join(','));
}
writeFileSync('siju_lookup_table.csv', '﻿' + lines.join('\r\n'), 'utf8');
console.log('저장: siju_lookup_table.csv (일간 10 × 시지 12)');

// 2) 검증 — 표준 조견표와 대조
//   갑/기일 자시=갑자, 병/신일 자시=무자, 무/계일 자시=임자
const checks = [
  ['갑', 0, '갑자'], ['기', 0, '갑자'],
  ['을', 0, '병자'], ['경', 0, '병자'],
  ['병', 0, '무자'], ['신', 0, '무자'],
  ['정', 0, '경자'], ['임', 0, '경자'],
  ['무', 0, '임자'], ['계', 0, '임자'],
  ['병', 3, '경인'],   // 병일 인시 = 경인
  ['갑', 12, '경오'],  // 갑일 오시 = 경오
];
let ok = 0;
for (const [stem, hour, expect] of checks) {
  const got = getHourPillar(stem, hour, 0).pillar;
  const pass = got === expect;
  if (pass) ok++;
  console.log(`  ${pass ? 'OK ' : 'FAIL'} ${stem}일 ${hour}시 -> ${got} (기대 ${expect})`);
}
console.log(`검증 ${ok}/${checks.length} 통과`);

// 3) 실제 사용 예시: 특정 생년월일시의 사주 4기둥 뽑기
const rows = JSON.parse(readFileSync('manseryeok_1900_2050.json', 'utf8'));
function sajuFourPillars(dateStr, hour, minute = 0, opts = {}) {
  const day = rows.find((r) => r.solar_date === dateStr);
  if (!day) throw new Error(`데이터 범위 밖: ${dateStr}`);
  const dayStem = day.day_pillar[0];             // 일주의 첫 글자 = 일간
  const siju = getHourPillar(dayStem, hour, minute, opts);
  return {
    양력: dateStr, 시각: `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`,
    년주: `${day.year_pillar}(${day.year_pillar_hanja})`,
    월주: `${day.month_pillar}(${day.month_pillar_hanja})`,
    일주: `${day.day_pillar}(${day.day_pillar_hanja})`,
    시주: `${siju.pillar}(${siju.pillarHanja})`,
  };
}
console.log('\n예시) 1984-02-02 05:30 출생의 사주 4기둥:');
console.log(JSON.stringify(sajuFourPillars('1984-02-02', 5, 30), null, 2));
