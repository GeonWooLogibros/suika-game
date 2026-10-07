import { describe, expect, it } from 'vitest';
import { BIN_W, DROP_TIERS, FRUITS, WATERMELON, mergeScore } from '../src/game/fruits';

describe('과일 표', () => {
  it('11단계이고 마지막이 수박입니다', () => {
    expect(FRUITS).toHaveLength(11);
    expect(FRUITS[WATERMELON].name).toBe('수박');
    expect(DROP_TIERS).toBe(5);
  });

  it('단계가 올라갈수록 반지름이 커집니다', () => {
    for (let i = 1; i < FRUITS.length; i++) expect(FRUITS[i].radius).toBeGreaterThan(FRUITS[i - 1].radius);
  });

  it('수박의 지름은 통 너비의 절반입니다', () => {
    expect(FRUITS[WATERMELON].radius * 2).toBe(BIN_W / 2);
  });

  it('합친 과일의 단계에 따라 원작과 같은 점수를 줍니다', () => {
    const scores = FRUITS.map((_, tier) => mergeScore(tier));
    expect(scores).toEqual([1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66]);
  });
});
