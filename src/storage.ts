export type Store = Pick<Storage, 'getItem' | 'setItem'>;

/** 같은 주소의 저장 공간을 다른 게임이 함께 쓰므로, 이 두 키 외에는 읽거나 쓰지 않습니다. */
export const BEST_KEY = 'suika-game.best.v1';
export const NAME_KEY = 'suika-game.name.v1';
const NAME_LIMIT = 12;

export function browserStorage(): Store | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadBest(store: Store | null): number {
  try {
    const raw = store?.getItem(BEST_KEY);
    if (!raw || !/^\d{1,9}$/.test(raw)) return 0;
    return Number(raw);
  } catch {
    return 0;
  }
}

/** 점수가 최고 점수보다 높으면 저장하고, 저장 후의 최고 점수를 돌려줍니다. */
export function saveBest(store: Store | null, score: number): number {
  const best = Math.max(loadBest(store), Math.max(0, Math.floor(score)));
  try {
    store?.setItem(BEST_KEY, String(best));
  } catch {
    // 저장하지 못해도 이번 판의 점수는 화면에 그대로 보여 줍니다.
  }
  return best;
}

export function loadName(store: Store | null): string {
  try {
    return Array.from(store?.getItem(NAME_KEY) ?? '')
      .slice(0, NAME_LIMIT)
      .join('');
  } catch {
    return '';
  }
}

export function saveName(store: Store | null, name: string): void {
  try {
    store?.setItem(NAME_KEY, Array.from(name).slice(0, NAME_LIMIT).join(''));
  } catch {
    // 이름을 저장하지 못해도 이번 접속에서는 입력한 이름을 씁니다.
  }
}
