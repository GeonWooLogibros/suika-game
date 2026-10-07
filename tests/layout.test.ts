import { describe, expect, it } from 'vitest';
import { BIN_H, BIN_W } from '../src/game/fruits';
import { computeLayout, toBinX, type Rect } from '../src/render/layout';

const SIZES: [number, number][] = [
  [320, 480],
  [390, 844],
  [800, 360],
  [1024, 768],
  [1920, 1080],
];

const inside = (rect: Rect, width: number, height: number): boolean =>
  rect.x >= 0 && rect.y >= 0 && rect.x + rect.w <= width + 0.001 && rect.y + rect.h <= height + 0.001;

const overlap = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe('화면 배치', () => {
  for (const [width, height] of SIZES) {
    for (let rivals = 0; rivals <= 3; rivals++) {
      it(`${width}×${height}, 상대 ${rivals}명: 모두 화면 안에 있고 겹치지 않습니다`, () => {
        const layout = computeLayout(width, height, rivals);
        expect(layout.rivals).toHaveLength(rivals);
        expect(layout.scale).toBeGreaterThan(0);
        expect(inside(layout.bin, width, height)).toBe(true);
        expect(layout.bin.w / layout.bin.h).toBeCloseTo(BIN_W / BIN_H, 5);
        expect(overlap(layout.bin, layout.hud)).toBe(false);
        layout.rivals.forEach((rect, i) => {
          expect(rect.w).toBeGreaterThan(10);
          expect(inside(rect, width, height)).toBe(true);
          expect(overlap(rect, layout.bin)).toBe(false);
          for (let j = 0; j < i; j++) expect(overlap(rect, layout.rivals[j])).toBe(false);
        });
      });
    }
  }

  it('넓은 화면에서 상대의 통은 화면 구석이 아니라 내 통 바로 옆에 놓입니다', () => {
    for (let rivals = 1; rivals <= 3; rivals++) {
      const layout = computeLayout(1920, 1080, rivals);
      for (const rect of layout.rivals) {
        const gap = rect.x - (layout.bin.x + layout.bin.w);
        expect(gap).toBeGreaterThan(0);
        expect(gap).toBeLessThan(80);
        expect(rect.w).toBeGreaterThanOrEqual(100);
      }
      // 내 통과 상대의 통을 한 묶음으로 보고 화면 가운데에 둡니다.
      const left = layout.bin.x;
      const right = 1920 - Math.max(...layout.rivals.map((rect) => rect.x + rect.w));
      expect(Math.abs(left - right)).toBeLessThan(120);
    }
  });

  it('상대의 수가 범위를 벗어나면 0명에서 3명 사이로 맞춥니다', () => {
    expect(computeLayout(800, 600, -2).rivals).toHaveLength(0);
    expect(computeLayout(800, 600, 9).rivals).toHaveLength(3);
  });

  it('화면 좌표를 통 안의 좌표로 바꿉니다', () => {
    const layout = computeLayout(800, 600, 0);
    expect(toBinX(layout.bin.x, layout)).toBeCloseTo(0);
    expect(toBinX(layout.bin.x + layout.bin.w, layout)).toBeCloseTo(BIN_W);
  });
});
