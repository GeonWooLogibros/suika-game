import { describe, expect, it } from 'vitest';
import { BIN_H, BIN_W, STONE } from '../src/game/fruits';
import { MAX_SNAPSHOT_FRUITS, blendBins, decodeBin, encodeBin, type BinFruit } from '../src/game/snapshot';

describe('통 요약', () => {
  it('인코딩한 뒤 디코딩하면 거의 같은 값이 나옵니다', () => {
    const fruits: BinFruit[] = [
      { x: 0, y: 0, tier: 0 },
      { x: 123.4, y: 456.7, tier: 5 },
      { x: BIN_W, y: BIN_H, tier: 10 },
    ];
    const text = encodeBin(fruits);
    expect(text).toHaveLength(15);
    const back = decodeBin(text);
    expect(back).toHaveLength(3);
    back?.forEach((fruit, i) => {
      expect(fruit.x).toBeCloseTo(fruits[i].x, 0);
      expect(fruit.y).toBeCloseTo(fruits[i].y, 0);
      expect(fruit.tier).toBe(fruits[i].tier);
    });
  });

  it('통 밖의 좌표는 통 안으로 맞추고, 잘못된 단계의 과일은 뺍니다', () => {
    const back = decodeBin(
      encodeBin([
        { x: -50, y: 9999, tier: 1 },
        { x: 10, y: 10, tier: 12 },
        { x: 10, y: 10, tier: 1.5 },
        { x: Number.NaN, y: 10, tier: 2 },
      ]),
    );
    expect(back).toHaveLength(2);
    expect(back?.[0]).toEqual({ x: 0, y: BIN_H, tier: 1 });
    expect(back?.[1].x).toBe(0);
  });

  it('과일이 150개를 넘으면 넘는 과일은 요약에서 뺍니다', () => {
    const many = Array.from({ length: 400 }, (_, i) => ({ x: i % BIN_W, y: 100, tier: 0 }));
    const text = encodeBin(many);
    expect(text).toHaveLength(MAX_SNAPSHOT_FRUITS * 5);
    expect(decodeBin(text)).toHaveLength(MAX_SNAPSHOT_FRUITS);
  });

  it('방해 구슬도 요약에 담습니다', () => {
    const back = decodeBin(encodeBin([{ x: 100, y: 200, tier: STONE }]));
    expect(back).toHaveLength(1);
    expect(back?.[0].tier).toBe(STONE);
  });

  it('빈 통은 빈 문자열입니다', () => {
    expect(encodeBin([])).toBe('');
    expect(decodeBin('')).toEqual([]);
  });

  it('형식이 잘못된 값은 거부합니다', () => {
    expect(decodeBin(undefined)).toBeNull();
    expect(decodeBin(12345)).toBeNull();
    expect(decodeBin('abcd')).toBeNull();
    expect(decodeBin('ABCDE')).toBeNull();
    expect(decodeBin('00 00')).toBeNull();
    expect(decodeBin('<b>00')).toBeNull();
    expect(decodeBin('0000c')).toBeNull();
    expect(decodeBin('00000'.repeat(MAX_SNAPSHOT_FRUITS + 1))).toBeNull();
  });

  it('두 요약 사이를 보간합니다', () => {
    const prev = [{ x: 100, y: 100, tier: 3 }];
    const next = [{ x: 120, y: 140, tier: 3 }];
    expect(blendBins(prev, next, 0.5)).toEqual([{ x: 110, y: 120, tier: 3 }]);
    expect(blendBins(prev, next, 0)).toEqual(prev);
    expect(blendBins(prev, next, 5)).toEqual(next);
    expect(blendBins(prev, next, Number.NaN)).toEqual(next);
  });

  it('과일의 수나 순서가 달라져도 같은 단계의 가까운 과일끼리 잇습니다', () => {
    const prev = [
      { x: 50, y: 400, tier: 1 },
      { x: 300, y: 400, tier: 2 },
    ];
    const next = [
      { x: 300, y: 420, tier: 2 },
      { x: 50, y: 420, tier: 1 },
      { x: 180, y: 36, tier: 0 },
    ];
    expect(blendBins(prev, next, 0.5)).toEqual([
      { x: 300, y: 410, tier: 2 },
      { x: 50, y: 410, tier: 1 },
      { x: 180, y: 36, tier: 0 },
    ]);
  });

  it('멀리 떨어진 과일은 잇지 않고 새 위치에 바로 둡니다', () => {
    const prev = [{ x: 10, y: 10, tier: 1 }];
    const next = [{ x: 350, y: 470, tier: 1 }];
    expect(blendBins(prev, next, 0.5)).toEqual(next);
  });
});
