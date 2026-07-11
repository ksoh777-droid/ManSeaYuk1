// 시주(時柱) 계산 모듈 — 시두법(五鼠遁) 기반
// 사용법:
//   import { getHourPillar, getHourBranch } from './hour_pillar.mjs';
//   getHourPillar('병', 3, 30);  // 일간 '병', 03:30 -> { pillar:'경인', ... }

// 천간 10 (갑0 ~ 계9)
export const TIANGAN = ['갑','을','병','정','무','기','경','신','임','계'];
export const TIANGAN_HANJA = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
// 지지 12 (자0 ~ 해11)
export const DIZHI = ['자','축','인','묘','진','사','오','미','신','유','술','해'];
export const DIZHI_HANJA = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

// 시지별 시간대(만세력 표준: 자시 23:00~00:59)
export const HOUR_RANGES = [
  ['자', '23:00~00:59'], ['축', '01:00~02:59'], ['인', '03:00~04:59'],
  ['묘', '05:00~06:59'], ['진', '07:00~08:59'], ['사', '09:00~10:59'],
  ['오', '11:00~12:59'], ['미', '13:00~14:59'], ['신', '15:00~16:59'],
  ['유', '17:00~18:59'], ['술', '19:00~20:59'], ['해', '21:00~22:59'],
];

/**
 * 시각 -> 시지 인덱스(0~11)
 * @param {number} hour 0~23
 * @param {number} minute 0~59
 * @param {boolean} longitudeCorrection 한국 표준시(동경135도) 보정: 참이면 30분을 뺌(진태양시 근사)
 */
export function getHourBranch(hour, minute = 0, longitudeCorrection = false) {
  let mins = hour * 60 + minute;
  if (longitudeCorrection) mins -= 30;           // 동경 135도 -> 약 127.5도 보정
  mins = ((mins % 1440) + 1440) % 1440;          // 0~1439로 정규화
  return Math.floor((mins + 60) / 120) % 12;     // 23:00~00:59 -> 자(0)
}

/**
 * 시주 계산 (시두법 五鼠遁)
 * @param {string} dayStem 일간 한글 (예: '병') — 만세력 데이터의 day_pillar 첫 글자
 * @param {number} hour 0~23
 * @param {number} minute 0~59
 * @param {object} opts { longitudeCorrection?:boolean }
 */
export function getHourPillar(dayStem, hour, minute = 0, opts = {}) {
  const stemId = TIANGAN.indexOf(dayStem);
  if (stemId < 0) throw new Error(`알 수 없는 일간: ${dayStem}`);
  const branchId = getHourBranch(hour, minute, opts.longitudeCorrection);
  // 五鼠遁: 자시 시작 천간 = (일간 % 5) * 2
  //   갑/기->갑(0), 을/경->병(2), 병/신->무(4), 정/임->경(6), 무/계->임(8)
  const startStem = (stemId % 5) * 2;
  const hourStemId = (startStem + branchId) % 10;
  return {
    pillar: TIANGAN[hourStemId] + DIZHI[branchId],
    pillarHanja: TIANGAN_HANJA[hourStemId] + DIZHI_HANJA[branchId],
    hourStem: TIANGAN[hourStemId],
    hourBranch: DIZHI[branchId],
    branchIndex: branchId,
    range: HOUR_RANGES[branchId][1],
  };
}
