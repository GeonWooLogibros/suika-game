import { DROP_TIERS, WATERMELON } from './fruits';

/** 시드가 같으면 같은 값이 차례로 나오는 난수. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface FruitQueue {
  /** 지금 들고 있는 과일의 단계. */
  current(): number;
  /** 다음에 나올 과일의 단계. */
  upcoming(): number;
  advance(): void;
}

/**
 * 떨어뜨릴 과일의 순서를 만듭니다. boost는 개발 중에 큰 과일을 빨리 만들어 보려고 단계를 올리는 값이고,
 * 수박이 바로 나오지는 않게 멜론까지만 올립니다.
 */
export function makeFruitQueue(seed: number, boost = 0): FruitQueue {
  const rand = mulberry32(seed);
  const pick = (): number => Math.min(WATERMELON - 1, Math.floor(rand() * DROP_TIERS) + Math.max(0, Math.floor(boost)));
  let now = pick();
  let next = pick();
  return {
    current: () => now,
    upcoming: () => next,
    advance: () => {
      now = next;
      next = pick();
    },
  };
}
