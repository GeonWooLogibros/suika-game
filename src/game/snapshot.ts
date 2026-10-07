import { BIN_H, BIN_W, FRUITS } from './fruits';

/** 다른 사람에게 보내는 통 요약의 과일 하나. */
export interface BinFruit {
  x: number;
  y: number;
  tier: number;
}

/** 요약에 담는 과일의 상한. 방의 presence는 전체가 4KiB를 넘으면 안 되므로 길이를 묶어 둡니다. */
export const MAX_SNAPSHOT_FRUITS = 150;
/** 과일 하나를 나타내는 글자 수: x 2자, y 2자, 단계 1자(모두 36진수). */
const CELL = 5;
/** 36진수 두 글자로 나타낼 수 있는 가장 큰 값. */
const RANGE = 36 * 36 - 1;
const PATTERN = /^[0-9a-z]*$/;
/** 두 요약 사이에서 같은 과일로 볼 수 있는 가장 먼 거리. */
const REACH = BIN_W * 0.25;

function pack(value: number, size: number): string {
  const ratio = Number.isFinite(value) ? value / size : 0;
  return Math.max(0, Math.min(RANGE, Math.round(ratio * RANGE)))
    .toString(36)
    .padStart(2, '0');
}

/** 통 안의 과일을 짧은 문자열로 줄입니다. */
export function encodeBin(fruits: readonly BinFruit[]): string {
  let text = '';
  let count = 0;
  for (const fruit of fruits) {
    if (count >= MAX_SNAPSHOT_FRUITS) break;
    if (!Number.isInteger(fruit.tier) || fruit.tier < 0 || fruit.tier >= FRUITS.length) continue;
    text += pack(fruit.x, BIN_W) + pack(fruit.y, BIN_H) + fruit.tier.toString(36);
    count++;
  }
  return text;
}

/** 다른 사람이 보낸 요약을 읽습니다. 형식이 조금이라도 다르면 null을 돌려주어 쓰지 않게 합니다. */
export function decodeBin(value: unknown): BinFruit[] | null {
  if (typeof value !== 'string') return null;
  if (value.length % CELL !== 0 || value.length > MAX_SNAPSHOT_FRUITS * CELL || !PATTERN.test(value)) return null;
  const fruits: BinFruit[] = [];
  for (let i = 0; i < value.length; i += CELL) {
    const tier = parseInt(value[i + 4], 36);
    if (tier >= FRUITS.length) return null;
    fruits.push({
      x: (parseInt(value.slice(i, i + 2), 36) / RANGE) * BIN_W,
      y: (parseInt(value.slice(i + 2, i + 4), 36) / RANGE) * BIN_H,
      tier,
    });
  }
  return fruits;
}

/**
 * 직전 요약과 새 요약 사이를 보간합니다. 요약에는 과일의 번호가 없으므로,
 * 같은 단계이면서 가장 가까운 과일끼리 같은 과일로 보고 잇습니다.
 */
export function blendBins(prev: readonly BinFruit[], next: readonly BinFruit[], t: number): BinFruit[] {
  const k = Number.isFinite(t) ? Math.max(0, Math.min(1, t)) : 1;
  if (k >= 1 || prev.length === 0) return next.map((fruit) => ({ ...fruit }));
  const used = new Array<boolean>(prev.length).fill(false);
  return next.map((fruit) => {
    let best = -1;
    let bestDistance = REACH * REACH;
    for (let j = 0; j < prev.length; j++) {
      const candidate = prev[j];
      if (used[j] || candidate.tier !== fruit.tier) continue;
      const distance = (candidate.x - fruit.x) ** 2 + (candidate.y - fruit.y) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = j;
      }
    }
    if (best < 0) return { ...fruit };
    used[best] = true;
    const from = prev[best];
    return { x: from.x + (fruit.x - from.x) * k, y: from.y + (fruit.y - from.y) * k, tier: fruit.tier };
  });
}
