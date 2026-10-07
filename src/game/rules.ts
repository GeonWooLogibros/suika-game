import { LINE_Y, WATERMELON } from './fruits';

/** 물리를 한 걸음 진행하는 시간(밀리초). 화면 주사율과 상관없이 이 간격으로 진행합니다. */
export const STEP_MS = 1000 / 60;
/** 한 프레임에 진행하는 걸음의 상한. 탭이 숨겨졌다 돌아왔을 때 한꺼번에 많이 진행되지 않게 합니다. */
export const MAX_STEPS_PER_FRAME = 5;
/** 과일을 놓은 뒤 다음 과일이 나오기까지의 걸음 수(약 0.5초). */
export const DROP_COOLDOWN_TICKS = 30;
/** 과일이 선 위에 이만큼 머물면 판이 끝납니다(약 2초). */
export const OVERFLOW_TICKS = 120;

/** 같은 단계 둘을 합쳤을 때 생기는 단계. 수박끼리는 사라지므로 null입니다. */
export function mergeResult(tier: number): number | null {
  return tier >= WATERMELON ? null : tier + 1;
}

/** 맞닿은 쌍 가운데 합칠 쌍을 고릅니다. 같은 단계끼리만 합치고, 과일 하나는 한 번만 씁니다. */
export function pickMerges(
  pairs: readonly (readonly [number, number])[],
  tierOf: (id: number) => number | undefined,
): [number, number][] {
  const used = new Set<number>();
  const merges: [number, number][] = [];
  for (const [a, b] of pairs) {
    if (a === b || used.has(a) || used.has(b)) continue;
    const tier = tierOf(a);
    if (tier === undefined || tier !== tierOf(b)) continue;
    used.add(a);
    used.add(b);
    merges.push([a, b]);
  }
  return merges;
}

/** 자리를 잡은 과일의 윗부분이 선보다 위에 있는지 여부. 방금 놓아서 아직 아무것에도 닿지 않은 과일은 제외합니다. */
export function isAboveLine(fruit: { y: number; radius: number; settled: boolean }): boolean {
  return fruit.settled && fruit.y - fruit.radius < LINE_Y;
}

/** 선을 넘은 과일이 있는 동안 걸음 수를 쌓고, 없으면 0으로 되돌립니다. */
export function nextOverflow(ticks: number, anyAbove: boolean): number {
  return anyAbove ? ticks + 1 : 0;
}

/** 방해 대전에서 과일을 합쳤을 때 상대에게 보내는 방해 구슬의 수. 감(4단계)부터 보내고, 클수록 많이 보냅니다. */
export function garbageFor(result: number | null): number {
  if (result === null) return 8;
  return Math.max(0, result - 3);
}
