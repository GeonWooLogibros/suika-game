import { describe, expect, it } from 'vitest';
import { DROP_TIERS, WATERMELON } from '../src/game/fruits';
import { makeFruitQueue, mulberry32 } from '../src/game/random';

function take(seed: number, count: number, boost = 0): number[] {
  const queue = makeFruitQueue(seed, boost);
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    out.push(queue.current());
    queue.advance();
  }
  return out;
}

describe('과일 순서', () => {
  it('같은 시드에서는 같은 순서가 나옵니다', () => {
    expect(take(1234, 50)).toEqual(take(1234, 50));
  });

  it('시드가 다르면 순서가 달라집니다', () => {
    expect(take(1, 50)).not.toEqual(take(2, 50));
  });

  it('앞의 5단계만 나옵니다', () => {
    const tiers = take(99, 500);
    expect(Math.min(...tiers)).toBe(0);
    expect(Math.max(...tiers)).toBe(DROP_TIERS - 1);
  });

  it('다음 과일은 advance 뒤에 현재 과일이 됩니다', () => {
    const queue = makeFruitQueue(7);
    const upcoming = queue.upcoming();
    queue.advance();
    expect(queue.current()).toBe(upcoming);
  });

  it('boost를 주면 단계가 올라가지만 수박은 나오지 않습니다', () => {
    const tiers = take(99, 500, 9);
    expect(Math.max(...tiers)).toBe(WATERMELON - 1);
  });

  it('난수는 0 이상 1 미만입니다', () => {
    const rand = mulberry32(0);
    for (let i = 0; i < 1000; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
