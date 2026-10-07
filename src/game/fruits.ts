/** 과일 표와 통의 크기. 길이는 모두 통 안의 논리 좌표이고, y는 아래로 갈수록 커집니다. */

export interface FruitKind {
  name: string;
  radius: number;
  color: string;
  /** 테두리와 무늬에 쓰는 진한 색. */
  accent: string;
}

export const FRUITS: readonly FruitKind[] = [
  { name: '체리', radius: 11, color: '#e8384f', accent: '#a81e33' },
  { name: '딸기', radius: 16, color: '#ff6b6b', accent: '#c93c4a' },
  { name: '포도', radius: 21, color: '#9b5de5', accent: '#6a34b0' },
  { name: '한라봉', radius: 24, color: '#ffa62b', accent: '#d47a00' },
  { name: '감', radius: 31, color: '#ff7f11', accent: '#c85a00' },
  { name: '사과', radius: 39, color: '#e63946', accent: '#a31621' },
  { name: '배', radius: 45, color: '#f2e394', accent: '#c2b04a' },
  { name: '복숭아', radius: 54, color: '#ffb5c2', accent: '#e0788c' },
  { name: '파인애플', radius: 61, color: '#ffd23f', accent: '#c99a00' },
  { name: '멜론', radius: 76, color: '#a8e06c', accent: '#6fae32' },
  { name: '수박', radius: 90, color: '#3fa34d', accent: '#1f6b2c' },
];

export const WATERMELON = FRUITS.length - 1;
/** 떨어뜨릴 과일로 나오는 단계의 수. 체리부터 감까지입니다. */
export const DROP_TIERS = 5;

export const BIN_W = 360;
export const BIN_H = 480;
/** 과일이 이 선 위에 오래 머물면 판이 끝납니다. */
export const LINE_Y = 70;
/** 과일을 놓는 높이. */
export const DROP_Y = 36;

/** 같은 단계의 과일 둘을 합쳤을 때 얻는 점수. 수박 둘은 66점입니다. */
export function mergeScore(tier: number): number {
  const n = tier + 1;
  return (n * (n + 1)) / 2;
}
