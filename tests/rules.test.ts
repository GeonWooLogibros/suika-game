import { describe, expect, it } from 'vitest';
import { LINE_Y, WATERMELON } from '../src/game/fruits';
import { OVERFLOW_TICKS, isAboveLine, mergeResult, nextOverflow, pickMerges } from '../src/game/rules';

describe('합치기', () => {
  it('다음 단계가 되고, 수박끼리는 사라집니다', () => {
    expect(mergeResult(0)).toBe(1);
    expect(mergeResult(WATERMELON - 1)).toBe(WATERMELON);
    expect(mergeResult(WATERMELON)).toBeNull();
  });

  it('같은 단계끼리 닿은 쌍만 고릅니다', () => {
    const tiers = new Map([
      [1, 0],
      [2, 0],
      [3, 1],
    ]);
    expect(pickMerges([[1, 3], [1, 2]], (id) => tiers.get(id))).toEqual([[1, 2]]);
  });

  it('과일 하나는 한 번만 합쳐집니다', () => {
    const tiers = new Map([
      [1, 2],
      [2, 2],
      [3, 2],
      [4, 2],
    ]);
    const merges = pickMerges([[1, 2], [2, 3], [3, 4], [1, 2]], (id) => tiers.get(id));
    expect(merges).toEqual([[1, 2], [3, 4]]);
  });

  it('없는 과일과 자기 자신과의 쌍은 무시합니다', () => {
    const tiers = new Map([[1, 0]]);
    expect(pickMerges([[1, 9], [1, 1]], (id) => tiers.get(id))).toEqual([]);
  });
});

describe('선 넘음', () => {
  it('자리를 잡은 과일의 윗부분이 선보다 위에 있을 때만 넘은 것으로 봅니다', () => {
    expect(isAboveLine({ y: LINE_Y + 5, radius: 10, settled: true })).toBe(true);
    expect(isAboveLine({ y: LINE_Y + 10, radius: 10, settled: true })).toBe(false);
  });

  it('방금 놓아서 아직 닿지 않은 과일은 제외합니다', () => {
    expect(isAboveLine({ y: 36, radius: 10, settled: false })).toBe(false);
  });

  it('넘은 과일이 있는 동안만 시간이 쌓이고, 없어지면 0으로 돌아갑니다', () => {
    let ticks = 0;
    for (let i = 0; i < OVERFLOW_TICKS - 1; i++) ticks = nextOverflow(ticks, true);
    expect(ticks).toBe(OVERFLOW_TICKS - 1);
    expect(nextOverflow(ticks, false)).toBe(0);
    expect(nextOverflow(ticks, true)).toBe(OVERFLOW_TICKS);
  });
});
