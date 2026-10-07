import { describe, expect, it } from 'vitest';
import { FRUITS, STONE, STONE_RADIUS, radiusOf } from '../src/game/fruits';
import { EXPRESSIONS, STONE_EXPRESSION } from '../src/render/fruit';

describe('과일의 표정', () => {
  it('과일마다 표정이 하나씩 있습니다', () => {
    expect(EXPRESSIONS).toHaveLength(FRUITS.length);
  });

  it('표정이 서로 겹치지 않습니다', () => {
    const seen = new Set([...EXPRESSIONS, STONE_EXPRESSION].map((face) => JSON.stringify(face)));
    expect(seen.size).toBe(FRUITS.length + 1);
  });

  it('눈 모양과 입 모양도 과일마다 한 번씩만 씁니다', () => {
    expect(new Set(EXPRESSIONS.map((face) => face.eyes)).size).toBe(FRUITS.length);
    expect(new Set(EXPRESSIONS.map((face) => face.mouth)).size).toBe(FRUITS.length);
  });
});

describe('방해 구슬', () => {
  it('과일 표 바로 다음 번호를 쓰고, 딸기보다 조금 작습니다', () => {
    expect(STONE).toBe(FRUITS.length);
    expect(radiusOf(STONE)).toBe(STONE_RADIUS);
    expect(STONE_RADIUS).toBeLessThan(FRUITS[1].radius);
  });

  it('반지름을 단계로 찾고, 없는 단계는 0입니다', () => {
    expect(radiusOf(0)).toBe(FRUITS[0].radius);
    expect(radiusOf(10)).toBe(FRUITS[10].radius);
    expect(radiusOf(99)).toBe(0);
    expect(radiusOf(-1)).toBe(0);
  });
});
