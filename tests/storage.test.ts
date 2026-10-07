import { describe, expect, it } from 'vitest';
import { BEST_KEY, NAME_KEY, loadBest, loadName, saveBest, saveName, type Store } from '../src/storage';

function memory(initial: Record<string, string> = {}): Store & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

const broken: Store = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
};

describe('저장', () => {
  it('최고 점수를 저장하고 다시 읽습니다', () => {
    const store = memory();
    expect(saveBest(store, 120)).toBe(120);
    expect(loadBest(store)).toBe(120);
  });

  it('더 낮은 점수로는 최고 점수가 바뀌지 않습니다', () => {
    const store = memory({ [BEST_KEY]: '300' });
    expect(saveBest(store, 100)).toBe(300);
    expect(store.data[BEST_KEY]).toBe('300');
  });

  it('저장된 값이 깨져 있으면 0으로 읽습니다', () => {
    for (const raw of ['abc', '-5', 'NaN', '1e999', '', '{"a":1}']) {
      expect(loadBest(memory({ [BEST_KEY]: raw }))).toBe(0);
    }
  });

  it('저장 공간이 없거나 오류가 나도 예외 없이 기본값을 씁니다', () => {
    expect(loadBest(null)).toBe(0);
    expect(loadBest(broken)).toBe(0);
    expect(saveBest(broken, 50)).toBe(50);
    expect(saveBest(null, 50)).toBe(50);
    expect(loadName(broken)).toBe('');
    expect(() => saveName(broken, '가')).not.toThrow();
  });

  it('이름은 12자까지만 저장합니다', () => {
    const store = memory();
    saveName(store, '가나다라마바사아자차카타파하');
    expect(loadName(store)).toBe('가나다라마바사아자차카타');
    expect(Object.keys(store.data)).toEqual([NAME_KEY]);
  });
});
