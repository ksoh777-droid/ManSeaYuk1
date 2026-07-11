// 웹 앱용 압축 데이터 추출 + 브라우저 계산식 전량 검증
import { readFileSync, writeFileSync } from 'node:fs';

const DATA = JSON.parse(readFileSync('manseryeok_1900_2050.json', 'utf8'));

const GAN = ['갑','을','병','정','무','기','경','신','임','계'];
const JI  = ['자','축','인','묘','진','사','오','미','신','유','술','해'];

// 간지 한글 -> id(0~59)
const pillarId = (p) => {
  for (let i = 0; i < 60; i++) if (GAN[i % 10] + JI[i % 12] === p) return i;
  return -1;
};

// 그레고리력 -> 율리우스적일(JDN, 정오 기준)
const toJDN = (y, m, d) => {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy
    + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
};

// ── 검증 1: JDN 공식이 데이터의 julian_day와 100% 일치하는가
// ── 검증 2: 일주 = (JDN + 49) % 60 이 데이터와 100% 일치하는가
let jdnFail = 0, dayFail = 0;
for (const r of DATA) {
  const jdn = toJDN(r.solar_year, r.solar_month, r.solar_day);
  if (jdn !== r.julian_day) jdnFail++;
  if ((jdn + 49) % 60 !== pillarId(r.day_pillar)) dayFail++;
}
console.log(`검증1 JDN 불일치: ${jdnFail}건`);
console.log(`검증2 일주 불일치: ${dayFail}건`);

// ── 년주/월주 변경점 추출 (일 단위 경계) ──
const yearChanges = [];  // [dateStr, yearPillarId]
const monthChanges = []; // [dateStr, monthPillarId]  (= 節 경계)
let prevY = null, prevM = null;
for (const r of DATA) {
  const yid = pillarId(r.year_pillar);
  const mid = pillarId(r.month_pillar);
  if (yid !== prevY) { yearChanges.push([r.solar_date, yid]); prevY = yid; }
  if (mid !== prevM) { monthChanges.push([r.solar_date, mid]); prevM = mid; }
}
console.log(`년주 변경점: ${yearChanges.length}, 월주(節) 변경점: ${monthChanges.length}`);

// ── 음력 월 시작점 추출 (lunar_day===1 인 날) ──
// [양력날짜, 음력년, 음력월, 윤달여부(0/1)]
const lunarMonths = [];
for (const r of DATA) {
  if (r.lunar_day === 1) {
    lunarMonths.push([r.solar_date, r.lunar_year, r.lunar_month, r.is_leap_month ? 1 : 0]);
  }
}
console.log(`음력 월 시작점: ${lunarMonths.length}`);

const web = {
  minDate: DATA[0].solar_date,
  maxDate: DATA[DATA.length - 1].solar_date,
  dayPillarOffset: 49,          // (JDN + 49) % 60
  yearChanges,
  monthChanges,
  lunarMonths,
};
writeFileSync('web_data.json', JSON.stringify(web));
console.log(`web_data.json 저장 (${(JSON.stringify(web).length/1024).toFixed(0)} KB)`);

// 검증 3: 변경점 룩업이 원본과 일치하는지 무작위(전량) 확인
function lookupPillar(changes, dateStr) {
  // 마지막으로 dateStr 이하인 변경점
  let lo = 0, hi = changes.length - 1, ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (changes[mid][0] <= dateStr) { ans = changes[mid][1]; lo = mid + 1; }
    else hi = mid - 1;
  }
  return ans;
}
let yF = 0, mF = 0;
for (const r of DATA) {
  if (lookupPillar(yearChanges, r.solar_date) !== pillarId(r.year_pillar)) yF++;
  if (lookupPillar(monthChanges, r.solar_date) !== pillarId(r.month_pillar)) mF++;
}
console.log(`검증3 년주 룩업 불일치: ${yF}, 월주 룩업 불일치: ${mF}`);

// 검증 4: 음력 월 시작점으로 모든 날짜의 음력(년/월/일/윤달)을 복원해 원본과 대조
function lookupLunar(dateStr) {
  let lo = 0, hi = lunarMonths.length - 1, idx = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lunarMonths[mid][0] <= dateStr) { idx = mid; lo = mid + 1; } else hi = mid - 1;
  }
  const [startDate, ly, lm, leap] = lunarMonths[idx];
  const [a, b, c] = startDate.split('-').map(Number);
  const [d, e, f] = dateStr.split('-').map(Number);
  const day = (toJDN(d, e, f) - toJDN(a, b, c)) + 1;
  return { ly, lm, day, leap };
}
let lF = 0;
for (const r of DATA) {
  const L = lookupLunar(r.solar_date);
  if (L.ly !== r.lunar_year || L.lm !== r.lunar_month || L.day !== r.lunar_day || L.leap !== (r.is_leap_month ? 1 : 0)) lF++;
}
console.log(`검증4 음력 룩업 불일치: ${lF}`);
console.log(jdnFail+dayFail+yF+mF+lF === 0 ? '✅ 전체 검증 통과' : '❌ 불일치 존재');
