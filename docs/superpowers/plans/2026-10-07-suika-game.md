# 수박게임 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 원작 규칙의 수박게임을 만들고, 방을 만들어 최대 4명이 누가 먼저 수박을 만드는지 겨룰 수 있게 합니다.

**Architecture:** 규칙은 `src/game/`의 순수 함수로 두고, matter-js는 `src/physics/world.ts` 한 파일만 사용합니다. `src/session.ts`가 물리와 규칙을 묶어 한 판을 진행하고, `src/multiplayer.ts`가 방의 presence를 읽고 써서 대기실과 승패를 관리합니다. 게임 화면은 Canvas 2D로 그리고, 버튼과 입력 칸이 있는 화면은 HTML 요소를 캔버스 위에 겹칩니다.

**Tech Stack:** Vite 7, TypeScript 7, Vitest 3, matter-js 0.20, peerjs 1.5 (공개 사이트용 빌드에서만 불러옴)

**Spec:** `docs/superpowers/specs/2026-10-07-suika-game-design.md`

## Global Constraints

- 작업 폴더는 `/Users/logibros/development/projects/game-projects/suika-game`입니다. 홈 폴더(`/Users/logibros`)도 git 저장소이므로, 모든 git 명령은 반드시 이 폴더 안에서 실행하고 `git add`에는 파일 경로를 직접 적습니다(`git add -A`, `git add .` 금지).
- 커밋 메시지는 영어 `feat:` / `test:` / `docs:` / `chore:` 형식이며, 끝에 `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>` 줄을 붙입니다.
- 코드 형식은 형제 프로젝트 `retro-racer`와 같습니다: 작은따옴표, 세미콜론, 줄 너비 120, 들여쓰기 2칸. 주석은 한국어 `/** ... */` 한두 줄로 "왜"를 적습니다.
- `src/game/`은 다른 폴더, matter-js, DOM을 불러오지 않습니다. matter-js는 `src/physics/world.ts`에서만 불러옵니다. `src/multiplayer.ts`는 `window`와 `document`를 사용하지 않습니다.
- 화면 문구: 버튼은 "~하기" 또는 명사형, 안내와 설명은 "~합니다" 형태로 씁니다.
- localStorage는 `suika-game.best.v1`, `suika-game.name.v1` 두 키만 읽고 씁니다. `localStorage.clear()`는 테스트와 브라우저 확인을 포함해 어디에서도 호출하지 않습니다(같은 localhost 주소를 다른 게임이 함께 씁니다).
- 과일 단계는 코드에서 0(체리)부터 10(수박)까지의 정수입니다.
- 통의 논리 크기는 너비 360, 높이 480이며, y는 아래로 갈수록 커집니다. 선은 y=70, 과일을 놓는 높이는 y=36입니다.
- 한 방의 presence 전체는 JSON 글자로 4KiB를 넘으면 안 됩니다. 통 요약은 최대 750자입니다.
- 이미지 파일과 음원 파일을 추가하지 않습니다.
- 이번 범위는 로컬 완성과 탭 두 개 확인까지입니다. 아티팩트 게시, GitHub 저장소 생성, 푸시는 하지 않습니다.

## Review Focus

스펙이 직접 말하지 않지만 실제 사용에서 문제가 되기 쉬운 입력과 상황입니다. 각 줄의 테스트는 괄호 안의 작업에 들어 있습니다.

1. **탭을 숨겼다가 돌아와서 한 프레임의 경과 시간이 매우 큰 경우**: 물리가 한꺼번에 수백 번 진행되지 않고, 최대 5번만 진행한 뒤 밀린 시간을 버려야 합니다. (Task 4)
2. **다른 사람이 보낸 값이 잘못된 경우**(통 요약에 이상한 글자, 5의 배수가 아닌 길이, 750자 초과, 점수가 NaN이나 음수, 이름에 제어 문자): 예외 없이 안전한 기본값으로 읽어야 합니다. (Task 7, Task 8)
3. **놓기 입력이 연달아 들어오는 경우**(키를 누르고 있거나 빠르게 두 번 누름): 다음 과일이 나오기 전에는 과일이 더 떨어지지 않아야 합니다. (Task 4)
4. **화면이 아주 작거나 가로로 긴 경우**(320×480, 800×360)와 상대가 3명인 경우: 내 통과 상대의 통이 화면 안에 들어오고 서로 겹치지 않아야 합니다. (Task 5)
5. **저장 공간을 쓸 수 없거나 저장된 값이 깨진 경우**: 최고 점수는 0, 이름은 빈 문자열로 읽고, 쓰기 오류는 무시해야 합니다. (Task 6)

---

## File Structure

```
suika-game/
  package.json  tsconfig.json  vite.config.ts  index.html  .env.web  README.md
  src/
    vite-env.d.ts
    main.ts                시작점, 프레임 반복, 화면 전환
    style.css              HTML 화면의 모양
    session.ts             한 판의 진행 (물리 + 규칙)
    multiplayer.ts         대기실과 대전의 상태 기계
    input.ts  audio.ts  storage.ts
    game/
      fruits.ts            과일 표, 통 크기, 점수
      random.ts            시드 난수, 과일 순서
      rules.ts             합치기 고르기, 선 넘음 판정, 시간 상수
      snapshot.ts          통 요약 인코딩·디코딩·보간
      match.ts             방 코드, 상태 읽기, 방장, 순위, 승패
    physics/
      world.ts             matter-js를 감싼 층
    net/
      types.ts  p2p-room.ts  peer-key.ts  connect.ts
    render/
      layout.ts  fruit.ts  effects.ts  scene.ts
    ui/
      menus.ts
  tests/
    fruits.test.ts  random.test.ts  rules.test.ts  world.test.ts  session.test.ts
    layout.test.ts  storage.test.ts  snapshot.test.ts  match.test.ts
    p2p-room.test.ts  multiplayer.test.ts
```

---

### Task 1: 프로젝트 뼈대, 과일 표, 과일 순서

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/vite-env.d.ts`, `src/main.ts`(임시), `src/game/fruits.ts`, `src/game/random.ts`
- Test: `tests/fruits.test.ts`, `tests/random.test.ts`

**Interfaces:**
- Produces:
  - `fruits.ts`: `FRUITS: readonly FruitKind[]`(`{ name, radius, color, accent }`, 11개), `WATERMELON = 10`, `DROP_TIERS = 5`, `BIN_W = 360`, `BIN_H = 480`, `LINE_Y = 70`, `DROP_Y = 36`, `mergeScore(tier: number): number`
  - `random.ts`: `mulberry32(seed: number): () => number`, `interface FruitQueue { current(): number; upcoming(): number; advance(): void }`, `makeFruitQueue(seed: number, boost?: number): FruitQueue`

- [ ] **Step 1: 설정 파일을 만듭니다**

`package.json`
```json
{
  "name": "suika-game",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "build:web": "tsc --noEmit && vite build --mode web --outDir dist-web",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "matter-js": "^0.20.0",
    "peerjs": "^1.5.5"
  },
  "devDependencies": {
    "@types/matter-js": "^0.20.2",
    "typescript": "^7.0.2",
    "vite": "^7.3.6",
    "vitest": "^3.2.7"
  }
}
```

`tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client"],
    "strict": true,
    "esModuleInterop": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src", "tests"]
}
```

`vite.config.ts`
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // 공개 사이트를 GitHub Pages처럼 하위 경로에 올려도 파일을 찾을 수 있게 상대 경로를 씁니다.
  base: './',
  test: {
    // 물리를 수백 걸음 진행하는 테스트가 있어서 넉넉히 둡니다.
    testTimeout: 20000,
  },
});
```

`index.html`
```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no" />
    <title>수박게임</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`src/vite-env.d.ts`
```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 공개 사이트에서 쓸 연결 방식. 'p2p'면 브라우저끼리 직접 연결합니다. claude.ai용 빌드에는 넣지 않습니다. */
  readonly VITE_NET?: 'p2p';
}
```

`src/main.ts` (Task 6에서 전체를 다시 씁니다)
```ts
const app = document.querySelector<HTMLDivElement>('#app');
if (app) app.textContent = '수박게임';
```

- [ ] **Step 2: 의존성을 설치합니다**

Run: `npm install`
Expected: 오류 없이 끝나고 `node_modules`와 `package-lock.json`이 생깁니다.

- [ ] **Step 3: 실패하는 테스트를 씁니다**

`tests/fruits.test.ts`
```ts
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
```

`tests/random.test.ts`
```ts
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
```

- [ ] **Step 4: 테스트가 실패하는지 확인합니다**

Run: `npm test`
Expected: FAIL, `../src/game/fruits`와 `../src/game/random`을 찾을 수 없다는 오류가 나옵니다.

- [ ] **Step 5: 구현합니다**

`src/game/fruits.ts`
```ts
/** 과일 표와 통의 크기. 길이는 모두 통 안의 논리 좌표이고, y는 아래로 갈수록 커집니다. */

export interface FruitKind {
  name: string;
  radius: number;
  color: string;
  /** 테두리와 무늬에 쓰는 진한 색. */
  accent: string;
}

export const FRUITS: readonly FruitKind[] = [
  { name: '체리', radius: 11, color: '#e8384f', accent: '#a81e33' },
  { name: '딸기', radius: 16, color: '#ff6b6b', accent: '#c93c4a' },
  { name: '포도', radius: 21, color: '#9b5de5', accent: '#6a34b0' },
  { name: '한라봉', radius: 24, color: '#ffa62b', accent: '#d47a00' },
  { name: '감', radius: 31, color: '#ff7f11', accent: '#c85a00' },
  { name: '사과', radius: 39, color: '#e63946', accent: '#a31621' },
  { name: '배', radius: 45, color: '#f2e394', accent: '#c2b04a' },
  { name: '복숭아', radius: 54, color: '#ffb5c2', accent: '#e0788c' },
  { name: '파인애플', radius: 61, color: '#ffd23f', accent: '#c99a00' },
  { name: '멜론', radius: 76, color: '#a8e06c', accent: '#6fae32' },
  { name: '수박', radius: 90, color: '#3fa34d', accent: '#1f6b2c' },
];

export const WATERMELON = FRUITS.length - 1;
/** 떨어뜨릴 과일로 나오는 단계의 수. 체리부터 감까지입니다. */
export const DROP_TIERS = 5;

export const BIN_W = 360;
export const BIN_H = 480;
/** 과일이 이 선 위에 오래 머물면 판이 끝납니다. */
export const LINE_Y = 70;
/** 과일을 놓는 높이. */
export const DROP_Y = 36;

/** 같은 단계의 과일 둘을 합쳤을 때 얻는 점수. 수박 둘은 66점입니다. */
export function mergeScore(tier: number): number {
  const n = tier + 1;
  return (n * (n + 1)) / 2;
}
```

`src/game/random.ts`
```ts
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
```

- [ ] **Step 6: 테스트와 빌드가 통과하는지 확인합니다**

Run: `npm test && npm run build`
Expected: 테스트 10개 PASS, 빌드가 오류 없이 끝나고 `dist/`가 생깁니다.

- [ ] **Step 7: 커밋합니다**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html src/vite-env.d.ts src/main.ts src/game/fruits.ts src/game/random.ts tests/fruits.test.ts tests/random.test.ts
git commit -m "feat: scaffold project with fruit table and seeded fruit queue

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: 합치기와 선 넘음 규칙

**Files:**
- Create: `src/game/rules.ts`
- Test: `tests/rules.test.ts`

**Interfaces:**
- Consumes: `FRUITS`, `WATERMELON`, `LINE_Y` (`fruits.ts`)
- Produces:
  - `STEP_MS = 1000 / 60`, `MAX_STEPS_PER_FRAME = 5`, `DROP_COOLDOWN_TICKS = 30`, `OVERFLOW_TICKS = 120`
  - `mergeResult(tier: number): number | null`
  - `pickMerges(pairs: readonly (readonly [number, number])[], tierOf: (id: number) => number | undefined): [number, number][]`
  - `isAboveLine(fruit: { y: number; radius: number; settled: boolean }): boolean`
  - `nextOverflow(ticks: number, anyAbove: boolean): number`

- [ ] **Step 1: 실패하는 테스트를 씁니다**

`tests/rules.test.ts`
```ts
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
```

- [ ] **Step 2: 테스트가 실패하는지 확인합니다**

Run: `npx vitest run tests/rules.test.ts`
Expected: FAIL, `../src/game/rules`를 찾을 수 없습니다.

- [ ] **Step 3: 구현합니다**

`src/game/rules.ts`
```ts
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
```

- [ ] **Step 4: 테스트가 통과하는지 확인합니다**

Run: `npx vitest run tests/rules.test.ts`
Expected: 7개 PASS

- [ ] **Step 5: 커밋합니다**

```bash
git add src/game/rules.ts tests/rules.test.ts
git commit -m "feat: add merge picking and overflow rules

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: 물리 세계 (matter-js)

**Files:**
- Create: `src/physics/world.ts`
- Test: `tests/world.test.ts`

**Interfaces:**
- Consumes: `BIN_W`, `BIN_H`, `FRUITS` (`fruits.ts`), `STEP_MS` (`rules.ts`)
- Produces:
  - `interface FruitBody { id: number; tier: number; x: number; y: number; angle: number; radius: number; settled: boolean }`
  - `class World { add(tier: number, x: number, y: number, settled?: boolean): number; remove(id: number): void; step(): void; get(id: number): FruitBody | undefined; tierOf(id: number): number | undefined; fruits(): FruitBody[]; contacts(): readonly (readonly [number, number])[] }`
  - `contacts()`는 마지막 `step()`에서 맞닿아 있던 과일 쌍입니다.

- [ ] **Step 1: 실패하는 테스트를 씁니다**

`tests/world.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import { BIN_H, BIN_W, FRUITS } from '../src/game/fruits';
import { World } from '../src/physics/world';

describe('물리 세계', () => {
  it('과일을 추가하고 지울 수 있습니다', () => {
    const world = new World();
    const id = world.add(2, 100, 50);
    expect(world.tierOf(id)).toBe(2);
    expect(world.get(id)?.radius).toBe(FRUITS[2].radius);
    world.remove(id);
    expect(world.get(id)).toBeUndefined();
    expect(world.fruits()).toHaveLength(0);
  });

  it('과일은 아래로 떨어져 바닥에서 멈춥니다', () => {
    const world = new World();
    const id = world.add(0, 180, 50);
    for (let i = 0; i < 300; i++) world.step();
    const fruit = world.get(id);
    expect(fruit?.y).toBeGreaterThan(BIN_H - FRUITS[0].radius - 3);
    expect(fruit?.y).toBeLessThan(BIN_H - FRUITS[0].radius + 3);
  });

  it('떨어지는 동안에는 자리를 잡지 않은 상태이고, 닿으면 자리를 잡습니다', () => {
    const world = new World();
    const id = world.add(0, 180, 50);
    world.step();
    expect(world.get(id)?.settled).toBe(false);
    for (let i = 0; i < 300; i++) world.step();
    expect(world.get(id)?.settled).toBe(true);
  });

  it('위아래로 놓인 두 과일이 닿으면 그 쌍을 알려 줍니다', () => {
    const world = new World();
    const a = world.add(0, 180, 300);
    const b = world.add(0, 180, 200);
    let met = false;
    for (let i = 0; i < 300 && !met; i++) {
      world.step();
      met = world.contacts().some(([p, q]) => (p === a && q === b) || (p === b && q === a));
    }
    expect(met).toBe(true);
  });

  it('과일을 많이 넣어도 통 밖으로 나가지 않습니다', () => {
    const world = new World();
    for (let i = 0; i < 40; i++) {
      const tier = i % 5;
      world.add(tier, 30 + ((i * 53) % 300), 40);
      for (let s = 0; s < 20; s++) world.step();
    }
    for (let s = 0; s < 600; s++) world.step();
    for (const fruit of world.fruits()) {
      expect(fruit.x).toBeGreaterThan(fruit.radius - 3);
      expect(fruit.x).toBeLessThan(BIN_W - fruit.radius + 3);
      expect(fruit.y).toBeLessThan(BIN_H - fruit.radius + 3);
    }
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인합니다**

Run: `npx vitest run tests/world.test.ts`
Expected: FAIL, `../src/physics/world`를 찾을 수 없습니다.

- [ ] **Step 3: 구현합니다**

`src/physics/world.ts`
```ts
import Matter from 'matter-js';
import { BIN_H, BIN_W, FRUITS } from '../game/fruits';
import { STEP_MS } from '../game/rules';

const { Bodies, Composite, Engine, Events } = Matter;

/** 손맛을 정하는 값. 실제로 해 보면서 여기에서 조정합니다. */
const GRAVITY = 1.4;
const RESTITUTION = 0.15;
const FRICTION = 0.4;
const AIR_FRICTION = 0.008;
/** 빠르게 떨어지는 과일이 뚫고 나가지 않도록 벽을 두껍게 둡니다. */
const WALL = 60;

export interface FruitBody {
  id: number;
  tier: number;
  x: number;
  y: number;
  angle: number;
  radius: number;
  /** 놓인 뒤 벽이나 다른 과일에 한 번이라도 닿았는지 여부. */
  settled: boolean;
}

interface Item {
  body: Matter.Body;
  tier: number;
  settled: boolean;
}

/** matter-js를 감싼 층. 바깥에는 과일의 위치와 맞닿은 쌍만 내보냅니다. */
export class World {
  private readonly engine = Engine.create({ positionIterations: 10, velocityIterations: 8 });
  private readonly items = new Map<number, Item>();
  /** matter-js가 붙인 몸체 번호에서 과일 번호를 찾습니다. */
  private readonly idOf = new Map<number, number>();
  private touching: [number, number][] = [];
  private nextId = 1;

  constructor() {
    this.engine.gravity.y = GRAVITY;
    const tall = BIN_H * 3;
    Composite.add(this.engine.world, [
      Bodies.rectangle(BIN_W / 2, BIN_H + WALL / 2, BIN_W + WALL * 2, WALL, { isStatic: true }),
      Bodies.rectangle(-WALL / 2, BIN_H - tall / 2, WALL, tall, { isStatic: true }),
      Bodies.rectangle(BIN_W + WALL / 2, BIN_H - tall / 2, WALL, tall, { isStatic: true }),
    ]);
    const collect = (event: Matter.IEventCollision<Matter.Engine>): void => {
      for (const pair of event.pairs) {
        const a = this.idOf.get(pair.bodyA.id);
        const b = this.idOf.get(pair.bodyB.id);
        const itemA = a === undefined ? undefined : this.items.get(a);
        const itemB = b === undefined ? undefined : this.items.get(b);
        if (itemA) itemA.settled = true;
        if (itemB) itemB.settled = true;
        if (a !== undefined && b !== undefined) this.touching.push([a, b]);
      }
    };
    Events.on(this.engine, 'collisionStart', collect);
    Events.on(this.engine, 'collisionActive', collect);
  }

  add(tier: number, x: number, y: number, settled = false): number {
    const body = Bodies.circle(x, y, FRUITS[tier].radius, {
      restitution: RESTITUTION,
      friction: FRICTION,
      frictionAir: AIR_FRICTION,
    });
    Composite.add(this.engine.world, body);
    const id = this.nextId++;
    this.items.set(id, { body, tier, settled });
    this.idOf.set(body.id, id);
    return id;
  }

  remove(id: number): void {
    const item = this.items.get(id);
    if (!item) return;
    Composite.remove(this.engine.world, item.body);
    this.items.delete(id);
    this.idOf.delete(item.body.id);
  }

  step(): void {
    this.touching = [];
    Engine.update(this.engine, STEP_MS);
  }

  tierOf(id: number): number | undefined {
    return this.items.get(id)?.tier;
  }

  get(id: number): FruitBody | undefined {
    const item = this.items.get(id);
    return item ? this.view(id, item) : undefined;
  }

  fruits(): FruitBody[] {
    const list: FruitBody[] = [];
    for (const [id, item] of this.items) list.push(this.view(id, item));
    return list;
  }

  /** 마지막 step에서 맞닿아 있던 과일 쌍. */
  contacts(): readonly (readonly [number, number])[] {
    return this.touching;
  }

  private view(id: number, item: Item): FruitBody {
    return {
      id,
      tier: item.tier,
      x: item.body.position.x,
      y: item.body.position.y,
      angle: item.body.angle,
      radius: FRUITS[item.tier].radius,
      settled: item.settled,
    };
  }
}
```

- [ ] **Step 4: 테스트가 통과하는지 확인합니다**

Run: `npx vitest run tests/world.test.ts && npx tsc --noEmit`
Expected: 5개 PASS, 타입 오류 없음. "바닥에서 멈춥니다" 테스트가 범위를 조금 벗어나 실패하면 걸음 수를 늘리지 말고 `RESTITUTION`을 낮춰서(예: 0.1) 과일이 덜 튀게 조정합니다.

- [ ] **Step 5: 커밋합니다**

```bash
git add src/physics/world.ts tests/world.test.ts
git commit -m "feat: wrap matter-js in a fruit physics world

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: 한 판의 진행 (Session)

**Files:**
- Create: `src/session.ts`
- Test: `tests/session.test.ts`

**Interfaces:**
- Consumes: `World`, `FruitBody` (`physics/world.ts`); `FruitQueue`, `makeFruitQueue` (`random.ts`); `pickMerges`, `mergeResult`, `isAboveLine`, `nextOverflow`, 시간 상수 (`rules.ts`); `mergeScore`, `FRUITS`, `BIN_W`, `BIN_H`, `DROP_Y`, `WATERMELON` (`fruits.ts`)
- Produces:
  - `interface MergeEvent { x: number; y: number; from: number; id: number | null; score: number }` (`from`은 합쳐진 과일의 단계, `id`는 새로 생긴 과일의 번호이며 수박끼리 사라졌으면 null)
  - `interface TickEvents { merges: MergeEvent[] }`
  - `class Session`:
    - `constructor(seed: number, options?: { boost?: number; queue?: FruitQueue })`
    - 읽기 전용 값: `world: World`, `score: number`, `top: number`, `ticks: number`, `over: boolean`, `watermelonAt: number | null`, `aimX: number`
    - `get held(): number | null` (다음 과일을 기다리는 중이거나 판이 끝났으면 null), `get upcoming(): number`, `get overflowRatio(): number` (0~1)
    - `aim(x: number): void`, `drop(): boolean`, `tick(): TickEvents`, `advance(ms: number): TickEvents`, `fruits(): FruitBody[]`

- [ ] **Step 1: 실패하는 테스트를 씁니다**

`tests/session.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import { BIN_H, BIN_W, FRUITS, WATERMELON } from '../src/game/fruits';
import type { FruitQueue } from '../src/game/random';
import { DROP_COOLDOWN_TICKS, MAX_STEPS_PER_FRAME, OVERFLOW_TICKS } from '../src/game/rules';
import { Session } from '../src/session';

/** 항상 같은 단계만 나오는 순서. */
function always(tier: number): FruitQueue {
  return { current: () => tier, upcoming: () => tier, advance: () => undefined };
}

function run(session: Session, ticks: number): void {
  for (let i = 0; i < ticks; i++) session.tick();
}

describe('한 판의 진행', () => {
  it('같은 시드에서는 같은 과일이 나옵니다', () => {
    const a = new Session(42);
    const b = new Session(42);
    expect(a.held).toBe(b.held);
    expect(a.upcoming).toBe(b.upcoming);
  });

  it('과일을 놓으면 통에 생기고, 다음 과일이 나올 때까지 들고 있는 과일이 없습니다', () => {
    const session = new Session(1, { queue: always(0) });
    expect(session.drop()).toBe(true);
    expect(session.fruits()).toHaveLength(1);
    expect(session.held).toBeNull();
    run(session, DROP_COOLDOWN_TICKS);
    expect(session.held).toBe(0);
  });

  it('다음 과일이 나오기 전에는 놓기 입력이 연달아 와도 하나만 떨어집니다', () => {
    const session = new Session(1, { queue: always(0) });
    expect(session.drop()).toBe(true);
    expect(session.drop()).toBe(false);
    session.tick();
    expect(session.drop()).toBe(false);
    expect(session.fruits()).toHaveLength(1);
  });

  it('겨냥 위치는 과일이 벽 안쪽에 있도록 제한됩니다', () => {
    const session = new Session(1, { queue: always(4) });
    session.aim(-100);
    expect(session.aimX).toBe(FRUITS[4].radius);
    session.aim(9999);
    expect(session.aimX).toBe(BIN_W - FRUITS[4].radius);
    session.aim(Number.NaN);
    expect(session.aimX).toBe(BIN_W - FRUITS[4].radius);
  });

  it('같은 과일 둘을 같은 자리에 놓으면 다음 단계 하나로 합쳐지고 점수를 얻습니다', () => {
    const session = new Session(1, { queue: always(0) });
    session.aim(180);
    session.drop();
    run(session, 120);
    session.drop();
    let merged = 0;
    for (let i = 0; i < 240; i++) merged += session.tick().merges.length;
    expect(merged).toBe(1);
    const fruits = session.fruits();
    expect(fruits).toHaveLength(1);
    expect(fruits[0].tier).toBe(1);
    expect(session.score).toBe(1);
    expect(session.top).toBe(1);
  });

  it('수박을 처음 만든 걸음을 기록합니다', () => {
    const session = new Session(1, { queue: always(0) });
    session.world.add(WATERMELON - 1, 180, BIN_H - FRUITS[WATERMELON - 1].radius, true);
    session.world.add(WATERMELON - 1, 180, BIN_H - FRUITS[WATERMELON - 1].radius * 3, true);
    run(session, 60);
    expect(session.watermelonAt).not.toBeNull();
    expect(session.top).toBe(WATERMELON);
    expect(session.fruits().some((fruit) => fruit.tier === WATERMELON)).toBe(true);
  });

  it('과일이 선 위에 2초 머물면 판이 끝나고, 그 뒤로는 진행하지 않습니다', () => {
    const session = new Session(1, { queue: always(0) });
    // 수박, 멜론, 파인애플을 한 줄로 쌓으면 맨 위 과일이 선보다 위에 놓입니다.
    session.world.add(10, 180, 390, true);
    session.world.add(9, 180, 224, true);
    session.world.add(8, 180, 87, true);
    run(session, OVERFLOW_TICKS - 10);
    expect(session.over).toBe(false);
    expect(session.overflowRatio).toBeGreaterThan(0.5);
    run(session, 20);
    expect(session.over).toBe(true);
    const ticks = session.ticks;
    session.tick();
    expect(session.ticks).toBe(ticks);
    expect(session.drop()).toBe(false);
  });

  it('방금 놓아서 떨어지는 과일은 선 넘음으로 세지 않습니다', () => {
    const session = new Session(1, { queue: always(0) });
    session.drop();
    run(session, 5);
    expect(session.overflowRatio).toBe(0);
  });

  it('바닥에만 과일이 있으면 오래 지나도 끝나지 않습니다', () => {
    const session = new Session(1, { queue: always(0) });
    session.drop();
    run(session, 400);
    expect(session.over).toBe(false);
  });

  it('경과 시간이 아주 커도 한 번에 정해진 걸음까지만 진행하고 밀린 시간은 버립니다', () => {
    const session = new Session(1, { queue: always(0) });
    session.advance(10000);
    expect(session.ticks).toBe(MAX_STEPS_PER_FRAME);
    session.advance(17);
    expect(session.ticks).toBe(MAX_STEPS_PER_FRAME + 1);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인합니다**

Run: `npx vitest run tests/session.test.ts`
Expected: FAIL, `../src/session`을 찾을 수 없습니다.

- [ ] **Step 3: 구현합니다**

`src/session.ts`
```ts
import { BIN_H, BIN_W, DROP_Y, FRUITS, WATERMELON, mergeScore } from './game/fruits';
import { makeFruitQueue, type FruitQueue } from './game/random';
import {
  DROP_COOLDOWN_TICKS,
  MAX_STEPS_PER_FRAME,
  OVERFLOW_TICKS,
  STEP_MS,
  isAboveLine,
  mergeResult,
  nextOverflow,
  pickMerges,
} from './game/rules';
import { World, type FruitBody } from './physics/world';

export interface MergeEvent {
  x: number;
  y: number;
  /** 합쳐진 과일의 단계. */
  from: number;
  /** 새로 생긴 과일의 번호. 수박끼리 합쳐져 사라졌으면 null입니다. */
  id: number | null;
  score: number;
}

export interface TickEvents {
  merges: MergeEvent[];
}

export interface SessionOptions {
  /** 개발 중에 큰 과일을 빨리 만들어 보려고 떨어뜨릴 과일의 단계를 올리는 값. */
  boost?: number;
  /** 테스트에서 과일 순서를 직접 정할 때 씁니다. */
  queue?: FruitQueue;
}

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

/** 한 판의 진행. 물리와 규칙을 묶어서 점수와 끝남 여부를 관리합니다. */
export class Session {
  readonly world = new World();
  score = 0;
  /** 지금까지 통에 있었던 가장 큰 과일의 단계. */
  top = 0;
  ticks = 0;
  over = false;
  /** 수박을 처음 만든 걸음. 같이 하기에서 누가 먼저 만들었는지 비교하는 데 씁니다. */
  watermelonAt: number | null = null;
  aimX = BIN_W / 2;
  private readonly queue: FruitQueue;
  private cooldown = 0;
  private overflow = 0;
  private backlog = 0;

  constructor(seed: number, options: SessionOptions = {}) {
    this.queue = options.queue ?? makeFruitQueue(seed, options.boost ?? 0);
    this.aim(this.aimX);
  }

  /** 지금 들고 있는 과일의 단계. 다음 과일을 기다리는 중이거나 판이 끝났으면 null입니다. */
  get held(): number | null {
    return this.over || this.cooldown > 0 ? null : this.queue.current();
  }

  get upcoming(): number {
    return this.queue.upcoming();
  }

  /** 선 넘음 시간이 얼마나 찼는지를 0에서 1 사이로 알려 줍니다. */
  get overflowRatio(): number {
    return Math.min(1, this.overflow / OVERFLOW_TICKS);
  }

  aim(x: number): void {
    if (!Number.isFinite(x)) return;
    const radius = FRUITS[this.queue.current()].radius;
    this.aimX = clamp(x, radius, BIN_W - radius);
  }

  drop(): boolean {
    const tier = this.held;
    if (tier === null) return false;
    this.world.add(tier, this.aimX, DROP_Y);
    this.top = Math.max(this.top, tier);
    this.queue.advance();
    this.cooldown = DROP_COOLDOWN_TICKS;
    // 다음 과일의 크기에 맞춰 겨냥 위치를 다시 제한합니다.
    this.aim(this.aimX);
    return true;
  }

  tick(): TickEvents {
    const events: TickEvents = { merges: [] };
    if (this.over) return events;
    this.ticks++;
    if (this.cooldown > 0) this.cooldown--;
    this.world.step();

    for (const [a, b] of pickMerges(this.world.contacts(), (id) => this.world.tierOf(id))) {
      const first = this.world.get(a);
      const second = this.world.get(b);
      if (!first || !second) continue;
      const from = first.tier;
      const result = mergeResult(from);
      this.world.remove(a);
      this.world.remove(b);
      let x = (first.x + second.x) / 2;
      let y = (first.y + second.y) / 2;
      let id: number | null = null;
      if (result !== null) {
        const radius = FRUITS[result].radius;
        x = clamp(x, radius, BIN_W - radius);
        y = Math.min(y, BIN_H - radius);
        id = this.world.add(result, x, y, true);
        this.top = Math.max(this.top, result);
        if (result === WATERMELON && this.watermelonAt === null) this.watermelonAt = this.ticks;
      }
      const score = mergeScore(from);
      this.score += score;
      events.merges.push({ x, y, from, id, score });
    }

    this.overflow = nextOverflow(this.overflow, this.world.fruits().some(isAboveLine));
    if (this.overflow >= OVERFLOW_TICKS) this.over = true;
    return events;
  }

  /** 지난 시간만큼 고정 간격으로 진행합니다. 한 번에 진행하는 걸음에 상한을 두고, 밀린 시간은 버립니다. */
  advance(ms: number): TickEvents {
    const events: TickEvents = { merges: [] };
    if (!Number.isFinite(ms) || ms <= 0) return events;
    this.backlog += ms;
    let steps = 0;
    while (this.backlog >= STEP_MS && steps < MAX_STEPS_PER_FRAME) {
      events.merges.push(...this.tick().merges);
      this.backlog -= STEP_MS;
      steps++;
    }
    if (this.backlog >= STEP_MS) this.backlog = 0;
    return events;
  }

  fruits(): FruitBody[] {
    return this.world.fruits();
  }
}
```

- [ ] **Step 4: 테스트가 통과하는지 확인합니다**

Run: `npx vitest run tests/session.test.ts && npx tsc --noEmit`
Expected: 10개 PASS, 타입 오류 없음.

"선 위에 2초" 테스트에서 쌓아 둔 과일이 넘어져서 실패한다면, 과일의 x를 바꾸지 말고 `world.ts`의 `FRICTION`을 높이는 방향으로 조정합니다. "합쳐지고 점수를 얻습니다" 테스트에서 합쳐지지 않으면 두 번째 과일이 첫 번째 과일 위에 닿았는지 `session.world.contacts()`를 출력해 확인합니다.

- [ ] **Step 5: 커밋합니다**

```bash
git add src/session.ts tests/session.test.ts
git commit -m "feat: run a single game session over physics and rules

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: 화면 배치와 Canvas 그리기

**Files:**
- Create: `src/render/layout.ts`, `src/render/fruit.ts`, `src/render/effects.ts`, `src/render/scene.ts`
- Test: `tests/layout.test.ts`

**Interfaces:**
- Consumes: `FRUITS`, `BIN_W`, `BIN_H`, `LINE_Y`, `DROP_Y`, `WATERMELON` (`fruits.ts`); `FruitBody` (`physics/world.ts`); `MergeEvent` (`session.ts`)
- Produces:
  - `layout.ts`: `interface Rect { x: number; y: number; w: number; h: number }`, `interface Layout { bin: Rect; scale: number; hud: Rect; rivals: Rect[] }`, `computeLayout(width: number, height: number, rivals: number): Layout`, `toBinX(clientX: number, layout: Layout): number`
  - `fruit.ts`: `drawFruit(ctx: CanvasRenderingContext2D, tier: number, x: number, y: number, radius: number, angle?: number): void`
  - `effects.ts`: `class Effects { merge(event: MergeEvent): void; update(seconds: number): void; scaleOf(id: number): number; draw(ctx: CanvasRenderingContext2D): void; clear(): void }`
  - `scene.ts`: `interface RivalDraw { name: string; score: number; top: number; state: 'play' | 'out' | 'win'; stale: boolean; fruits: readonly { x: number; y: number; tier: number }[] }`, `interface Scene { width: number; height: number; layout: Layout; fruits: readonly FruitBody[]; held: { tier: number; x: number } | null; upcoming: number | null; score: number; best: number; overflow: number; effects: Effects; rivals: readonly RivalDraw[]; countdown: number | null; note: string | null }`, `drawScene(ctx: CanvasRenderingContext2D, scene: Scene): void`

그리기 코드는 자동 테스트 대상이 아니며, Task 6의 브라우저 확인에서 검증합니다. 이 작업의 자동 테스트는 배치 계산입니다.

- [ ] **Step 1: 실패하는 테스트를 씁니다**

`tests/layout.test.ts`
```ts
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
```

- [ ] **Step 2: 테스트가 실패하는지 확인합니다**

Run: `npx vitest run tests/layout.test.ts`
Expected: FAIL, `../src/render/layout`을 찾을 수 없습니다.

- [ ] **Step 3: 배치를 구현합니다**

`src/render/layout.ts`
```ts
import { BIN_H, BIN_W } from '../game/fruits';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Layout {
  /** 내 통이 그려지는 화면 위의 자리. */
  bin: Rect;
  /** 통 안의 좌표 1이 화면에서 차지하는 길이. */
  scale: number;
  hud: Rect;
  /** 상대의 통이 그려지는 자리. 이름표는 각 자리의 바로 위에 씁니다. */
  rivals: Rect[];
}

const PAD = 8;
const GAP = 8;
const HUD_H = 56;
/** 상대의 통 위에 이름과 점수를 쓰는 줄의 높이. */
const LABEL_H = 22;
export const MAX_RIVALS = 3;

/** 화면 크기와 상대의 수에 맞춰 통의 자리를 정합니다. 가로로 넓으면 상대를 옆에, 아니면 위쪽 한 줄에 둡니다. */
export function computeLayout(width: number, height: number, rivals: number): Layout {
  const count = Math.max(0, Math.min(MAX_RIVALS, Math.floor(rivals) || 0));
  const hud: Rect = { x: PAD, y: PAD, w: Math.max(1, width - PAD * 2), h: HUD_H };
  const areaX = PAD;
  let areaY = PAD + HUD_H + GAP;
  let areaW = Math.max(1, width - PAD * 2);
  let areaH = Math.max(1, height - areaY - PAD);
  const rects: Rect[] = [];

  if (count > 0 && width > height) {
    const columnW = Math.min(150, areaW * 0.28);
    const cellH = Math.min((areaH - GAP * (count - 1)) / count, (columnW * BIN_H) / BIN_W + LABEL_H);
    const h = Math.max(1, cellH - LABEL_H);
    const w = (h * BIN_W) / BIN_H;
    const columnX = width - PAD - columnW;
    for (let i = 0; i < count; i++) {
      rects.push({ x: columnX + (columnW - w) / 2, y: areaY + i * (cellH + GAP) + LABEL_H, w, h });
    }
    areaW -= columnW + GAP;
  } else if (count > 0) {
    const rowH = Math.min(130, areaH * 0.22);
    const h = Math.max(1, rowH - LABEL_H);
    const w = (h * BIN_W) / BIN_H;
    const cellW = areaW / count;
    for (let i = 0; i < count; i++) {
      rects.push({ x: areaX + cellW * i + (cellW - w) / 2, y: areaY + LABEL_H, w, h });
    }
    areaY += rowH + GAP;
    areaH -= rowH + GAP;
  }

  const scale = Math.max(0.01, Math.min(areaW / BIN_W, areaH / BIN_H));
  const w = BIN_W * scale;
  const h = BIN_H * scale;
  return {
    bin: { x: areaX + (areaW - w) / 2, y: areaY + (areaH - h) / 2, w, h },
    scale,
    hud,
    rivals: rects,
  };
}

/** 화면의 가로 좌표를 통 안의 좌표로 바꿉니다. */
export function toBinX(clientX: number, layout: Layout): number {
  return (clientX - layout.bin.x) / layout.scale;
}
```

- [ ] **Step 4: 배치 테스트가 통과하는지 확인합니다**

Run: `npx vitest run tests/layout.test.ts`
Expected: 22개 PASS

- [ ] **Step 5: 과일 그리기를 구현합니다**

`src/render/fruit.ts`
```ts
import { FRUITS, WATERMELON } from '../game/fruits';

/** 과일 한 개를 그립니다. 색이 다른 원에 꼭지와 간단한 얼굴을 붙이고, 수박에는 줄무늬를 넣습니다. */
export function drawFruit(
  ctx: CanvasRenderingContext2D,
  tier: number,
  x: number,
  y: number,
  radius: number,
  angle = 0,
): void {
  const kind = FRUITS[tier];
  if (!kind || radius <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = kind.color;
  ctx.fill();

  if (tier === WATERMELON) {
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = kind.accent;
    ctx.lineWidth = radius * 0.14;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * radius * 0.4, -radius);
      ctx.quadraticCurveTo(i * radius * 0.75, 0, i * radius * 0.4, radius);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.strokeStyle = kind.accent;
  ctx.lineWidth = Math.max(1, radius * 0.08);
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(-radius * 0.38, -radius * 0.42, radius * 0.2, radius * 0.12, -0.6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(0, -radius * 0.94, radius * 0.16, radius * 0.08, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#5a8f3c';
  ctx.fill();

  // 아주 작게 그릴 때는 얼굴이 뭉개지므로 생략합니다.
  if (radius >= 7) {
    ctx.fillStyle = '#3b2a20';
    ctx.beginPath();
    ctx.arc(-radius * 0.28, -radius * 0.02, radius * 0.07, 0, Math.PI * 2);
    ctx.arc(radius * 0.28, -radius * 0.02, radius * 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, radius * 0.1, radius * 0.16, Math.PI * 0.15, Math.PI * 0.85);
    ctx.strokeStyle = '#3b2a20';
    ctx.lineWidth = Math.max(1, radius * 0.05);
    ctx.lineCap = 'round';
    ctx.stroke();
  }
  ctx.restore();
}
```

- [ ] **Step 6: 효과를 구현합니다**

`src/render/effects.ts`
```ts
import { FRUITS } from '../game/fruits';
import type { MergeEvent } from '../session';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface Popup {
  x: number;
  y: number;
  text: string;
  life: number;
}

const PARTICLE_LIFE = 0.5;
const POPUP_LIFE = 0.8;
/** 새로 생긴 과일이 커졌다가 돌아오는 시간(초). */
const POP_TIME = 0.18;

/** 과일이 합쳐질 때의 조각, 떠오르는 점수, 새 과일이 커졌다 돌아오는 효과. 좌표는 통 안의 좌표입니다. */
export class Effects {
  private particles: Particle[] = [];
  private popups: Popup[] = [];
  private readonly pops = new Map<number, number>();

  merge(event: MergeEvent): void {
    const kind = FRUITS[event.from];
    const speed = 60 + kind.radius * 2;
    for (let i = 0; i < 8; i++) {
      // 겉모습에만 쓰는 값이라 시드 난수를 쓰지 않습니다.
      const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.5;
      this.particles.push({
        x: event.x,
        y: event.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: PARTICLE_LIFE,
        color: kind.color,
      });
    }
    this.popups.push({ x: event.x, y: event.y, text: `+${event.score}`, life: POPUP_LIFE });
    if (event.id !== null) this.pops.set(event.id, POP_TIME);
  }

  update(seconds: number): void {
    for (const p of this.particles) {
      p.x += p.vx * seconds;
      p.y += p.vy * seconds;
      p.vy += 300 * seconds;
      p.life -= seconds;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const popup of this.popups) {
      popup.y -= 40 * seconds;
      popup.life -= seconds;
    }
    this.popups = this.popups.filter((popup) => popup.life > 0);
    for (const [id, left] of this.pops) {
      if (left - seconds <= 0) this.pops.delete(id);
      else this.pops.set(id, left - seconds);
    }
  }

  /** 과일을 그릴 때 반지름에 곱할 값. 막 생긴 과일은 조금 크게 그립니다. */
  scaleOf(id: number): number {
    const left = this.pops.get(id);
    return left === undefined ? 1 : 1 + 0.25 * (left / POP_TIME);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / PARTICLE_LIFE);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = "700 20px system-ui, 'Apple SD Gothic Neo', sans-serif";
    for (const popup of this.popups) {
      ctx.globalAlpha = Math.max(0, popup.life / POPUP_LIFE);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#ffffff';
      ctx.strokeText(popup.text, popup.x, popup.y);
      ctx.fillStyle = '#b3541e';
      ctx.fillText(popup.text, popup.x, popup.y);
    }
    ctx.globalAlpha = 1;
  }

  clear(): void {
    this.particles = [];
    this.popups = [];
    this.pops.clear();
  }
}
```

- [ ] **Step 7: 한 화면 그리기를 구현합니다**

`src/render/scene.ts`
```ts
import { BIN_H, BIN_W, DROP_Y, FRUITS, LINE_Y } from '../game/fruits';
import type { FruitBody } from '../physics/world';
import type { Effects } from './effects';
import { drawFruit } from './fruit';
import type { Layout, Rect } from './layout';

const FONT = "system-ui, 'Apple SD Gothic Neo', sans-serif";
const INK = '#5b3a1e';
/** 화면 오른쪽 위에 겹쳐 놓는 버튼이 차지하는 너비. 점수 표시가 이 자리를 피합니다. */
const BUTTON_ROOM = 150;

export interface RivalDraw {
  name: string;
  score: number;
  top: number;
  state: 'play' | 'out' | 'win';
  /** 한동안 소식이 없어서 연결이 불안정해 보이는지 여부. */
  stale: boolean;
  fruits: readonly { x: number; y: number; tier: number }[];
}

export interface Scene {
  width: number;
  height: number;
  layout: Layout;
  fruits: readonly FruitBody[];
  held: { tier: number; x: number } | null;
  upcoming: number | null;
  score: number;
  best: number;
  /** 선 넘음 시간이 찬 정도(0~1). */
  overflow: number;
  effects: Effects;
  rivals: readonly RivalDraw[];
  /** 시작 전에 세는 숫자. 세지 않을 때는 null입니다. */
  countdown: number | null;
  /** 통 위에 겹쳐서 보여 줄 안내 문구. */
  note: string | null;
}

function box(ctx: CanvasRenderingContext2D, rect: Rect, radius: number): void {
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.w, rect.h, radius);
}

function drawHud(ctx: CanvasRenderingContext2D, scene: Scene): void {
  const { hud } = scene.layout;
  const right = hud.x + Math.max(120, hud.w - BUTTON_ROOM);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.font = `800 26px ${FONT}`;
  ctx.fillText(String(scene.score), hud.x + 4, hud.y + 16, 110);
  ctx.font = `600 13px ${FONT}`;
  ctx.fillStyle = '#9a7650';
  ctx.fillText(`최고 ${scene.best}`, hud.x + 4, hud.y + 42, 110);

  if (scene.upcoming !== null) {
    ctx.textAlign = 'right';
    ctx.fillText('다음', right - 44, hud.y + 16);
    drawFruit(ctx, scene.upcoming, right - 20, hud.y + 16, Math.min(16, FRUITS[scene.upcoming].radius * 0.6));
  }

  // 과일이 커지는 순서를 작은 그림으로 보여 줍니다. 자리가 좁으면 간격을 줄입니다.
  const startX = hud.x + 122;
  const room = right - startX;
  if (room > 60) {
    const gap = Math.min(16, room / FRUITS.length);
    FRUITS.forEach((_, tier) => drawFruit(ctx, tier, startX + gap * (tier + 0.5), hud.y + 42, Math.min(6, gap * 0.42)));
  }
}

function drawBin(ctx: CanvasRenderingContext2D, scene: Scene): void {
  const { bin, scale } = scene.layout;
  box(ctx, bin, 10);
  ctx.fillStyle = '#fff9e8';
  ctx.fill();

  ctx.save();
  box(ctx, bin, 10);
  ctx.clip();
  ctx.translate(bin.x, bin.y);
  ctx.scale(scale, scale);

  ctx.strokeStyle = `rgba(214,48,49,${0.35 + 0.65 * scene.overflow})`;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(0, LINE_Y);
  ctx.lineTo(BIN_W, LINE_Y);
  ctx.stroke();
  ctx.setLineDash([]);

  if (scene.held) {
    ctx.strokeStyle = 'rgba(91,58,30,0.15)';
    ctx.beginPath();
    ctx.moveTo(scene.held.x, DROP_Y);
    ctx.lineTo(scene.held.x, BIN_H);
    ctx.stroke();
    drawFruit(ctx, scene.held.tier, scene.held.x, DROP_Y, FRUITS[scene.held.tier].radius);
  }
  for (const fruit of scene.fruits) {
    drawFruit(ctx, fruit.tier, fruit.x, fruit.y, fruit.radius * scene.effects.scaleOf(fruit.id), fruit.angle);
  }
  scene.effects.draw(ctx);
  ctx.restore();

  box(ctx, bin, 10);
  ctx.strokeStyle = '#c98b4a';
  ctx.lineWidth = 3;
  ctx.stroke();

  const cx = bin.x + bin.w / 2;
  const cy = bin.y + bin.h / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (scene.note) {
    box(ctx, bin, 10);
    ctx.fillStyle = 'rgba(255,244,220,0.7)';
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.font = `700 ${Math.max(13, Math.min(20, bin.w / 16))}px ${FONT}`;
    ctx.fillText(scene.note, cx, cy, bin.w - 24);
  }
  if (scene.countdown !== null) {
    ctx.font = `900 ${Math.round(bin.w / 3)}px ${FONT}`;
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(String(scene.countdown), cx, cy);
    ctx.fillStyle = '#e8590c';
    ctx.fillText(String(scene.countdown), cx, cy);
  }
}

function drawRival(ctx: CanvasRenderingContext2D, rect: Rect, rival: RivalDraw): void {
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.font = `700 12px ${FONT}`;
  ctx.fillText(rival.name, rect.x, rect.y - 11, rect.w * 0.62);
  ctx.textAlign = 'right';
  ctx.fillText(String(rival.score), rect.x + rect.w, rect.y - 11, rect.w * 0.36);

  box(ctx, rect, 6);
  ctx.fillStyle = '#fff9e8';
  ctx.fill();
  ctx.save();
  box(ctx, rect, 6);
  ctx.clip();
  ctx.translate(rect.x, rect.y);
  const scale = rect.w / BIN_W;
  ctx.scale(scale, scale);
  for (const fruit of rival.fruits) {
    const kind = FRUITS[fruit.tier];
    if (kind) drawFruit(ctx, fruit.tier, fruit.x, fruit.y, kind.radius);
  }
  ctx.restore();

  const label = rival.state === 'win' ? '수박 완성' : rival.state === 'out' ? '탈락' : rival.stale ? '연결 불안정' : null;
  if (label) {
    box(ctx, rect, 6);
    ctx.fillStyle = 'rgba(255,244,220,0.75)';
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.font = `700 12px ${FONT}`;
    ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w - 6);
  }
  box(ctx, rect, 6);
  ctx.strokeStyle = rival.state === 'win' ? '#2f9e44' : '#c98b4a';
  ctx.lineWidth = 2;
  ctx.stroke();
}

/** 통, 과일, 점수 표시, 상대의 통을 한 화면으로 그립니다. 상태를 읽기만 하고 바꾸지 않습니다. */
export function drawScene(ctx: CanvasRenderingContext2D, scene: Scene): void {
  ctx.fillStyle = '#fff4dc';
  ctx.fillRect(0, 0, scene.width, scene.height);
  drawHud(ctx, scene);
  drawBin(ctx, scene);
  scene.rivals.forEach((rival, i) => {
    const rect = scene.layout.rivals[i];
    if (rect) drawRival(ctx, rect, rival);
  });
}
```

- [ ] **Step 8: 타입 검사와 전체 테스트를 확인합니다**

Run: `npx tsc --noEmit && npm test`
Expected: 타입 오류 없음, 지금까지의 테스트 모두 PASS

- [ ] **Step 9: 커밋합니다**

```bash
git add src/render/layout.ts src/render/fruit.ts src/render/effects.ts src/render/scene.ts tests/layout.test.ts
git commit -m "feat: add responsive layout and canvas rendering

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: 혼자 하기 (입력, 소리, 저장, 화면, 시작점)

**Files:**
- Create: `src/storage.ts`, `src/input.ts`, `src/audio.ts`, `src/ui/menus.ts`, `src/style.css`
- Modify: `src/main.ts` (전체 교체)
- Test: `tests/storage.test.ts`

**Interfaces:**
- Consumes: `Session`, `computeLayout`, `toBinX`, `drawScene`, `Scene`, `Effects` (Task 4, 5)
- Produces:
  - `storage.ts`: `type Store = Pick<Storage, 'getItem' | 'setItem'>`, `BEST_KEY = 'suika-game.best.v1'`, `NAME_KEY = 'suika-game.name.v1'`, `browserStorage(): Store | null`, `loadBest(store: Store | null): number`, `saveBest(store: Store | null, score: number): number`(저장 후의 최고 점수를 돌려줌), `loadName(store: Store | null): string`, `saveName(store: Store | null, name: string): void`
  - `input.ts`: `interface Input { axis(): number; takePointer(): number | null; takeDrop(): boolean }`, `attachInput(canvas: HTMLCanvasElement): Input`
  - `audio.ts`: `interface Sound { muted: boolean; unlock(): void; toggle(): void; drop(): void; merge(tier: number): void; over(): void; win(): void }`, `createAudio(): Sound`
  - `ui/menus.ts`: `type MenuView`, `interface MenuActions`, `createMenus(root: HTMLElement, actions: MenuActions): { show(view: MenuView): void }` (이 작업에서는 `title`, `play`, `soloResult` 세 종류만 만들고, Task 11에서 `lobby`, `multiResult`를 더합니다)

- [ ] **Step 1: 저장의 실패하는 테스트를 씁니다**

`tests/storage.test.ts`
```ts
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
```

- [ ] **Step 2: 테스트가 실패하는지 확인합니다**

Run: `npx vitest run tests/storage.test.ts`
Expected: FAIL, `../src/storage`를 찾을 수 없습니다.

- [ ] **Step 3: 저장을 구현합니다**

`src/storage.ts`
```ts
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
```

- [ ] **Step 4: 저장 테스트가 통과하는지 확인합니다**

Run: `npx vitest run tests/storage.test.ts`
Expected: 5개 PASS

- [ ] **Step 5: 입력을 구현합니다**

`src/input.ts`
```ts
export interface Input {
  /** 키보드로 누르고 있는 방향. 왼쪽 -1, 오른쪽 1, 없으면 0입니다. */
  axis(): number;
  /** 마지막으로 가리킨 화면의 가로 좌표. 읽고 나면 비워집니다. */
  takePointer(): number | null;
  /** 놓기 입력이 있었는지 여부. 읽고 나면 지워집니다. */
  takeDrop(): boolean;
}

/** 터치, 마우스, 키보드 입력을 모아 둡니다. 게임은 프레임마다 모아 둔 값을 읽어 갑니다. */
export function attachInput(canvas: HTMLCanvasElement): Input {
  let left = false;
  let right = false;
  let pointer: number | null = null;
  let drop = false;
  let down = false;

  canvas.addEventListener('pointerdown', (event) => {
    down = true;
    pointer = event.clientX;
    canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (down || event.pointerType === 'mouse') pointer = event.clientX;
  });
  canvas.addEventListener('pointerup', (event) => {
    if (!down) return;
    down = false;
    pointer = event.clientX;
    drop = true;
  });
  canvas.addEventListener('pointercancel', () => {
    down = false;
  });

  const typing = (event: KeyboardEvent): boolean =>
    event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement;

  window.addEventListener('keydown', (event) => {
    if (typing(event)) return;
    if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') left = true;
    else if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') right = true;
    else if (event.key === ' ' || event.key === 'ArrowDown') {
      // 키를 누르고 있을 때 반복해서 오는 입력은 놓기로 세지 않습니다.
      if (!event.repeat) drop = true;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') left = false;
    if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') right = false;
  });
  window.addEventListener('blur', () => {
    left = false;
    right = false;
    down = false;
  });

  return {
    axis: () => (right ? 1 : 0) - (left ? 1 : 0),
    takePointer: () => {
      const value = pointer;
      pointer = null;
      return value;
    },
    takeDrop: () => {
      const value = drop;
      drop = false;
      return value;
    },
  };
}
```

- [ ] **Step 6: 소리를 구현합니다**

`src/audio.ts`
```ts
export interface Sound {
  muted: boolean;
  /** 브라우저는 사용자가 누른 뒤에만 소리를 낼 수 있으므로, 버튼을 눌렀을 때 부릅니다. */
  unlock(): void;
  toggle(): void;
  drop(): void;
  merge(tier: number): void;
  over(): void;
  win(): void;
}

/** 음원 파일 없이 Web Audio로 효과음을 합성합니다. 소리를 낼 수 없는 환경에서는 아무 일도 하지 않습니다. */
export function createAudio(): Sound {
  let context: AudioContext | null = null;

  const tone = (frequency: number, seconds: number, type: OscillatorType, delay = 0, volume = 0.18): void => {
    if (sound.muted || !context) return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + seconds);
  };

  const sound: Sound = {
    muted: false,
    unlock() {
      try {
        context ??= new AudioContext();
        void context.resume();
      } catch {
        context = null;
      }
    },
    toggle() {
      sound.muted = !sound.muted;
    },
    drop: () => tone(300, 0.08, 'sine', 0, 0.12),
    // 단계가 높을수록 낮은 소리를 냅니다.
    merge: (tier) => {
      const base = 720 - tier * 45;
      tone(base, 0.12, 'triangle');
      tone(base * 1.5, 0.16, 'triangle', 0.06);
    },
    over: () => {
      tone(330, 0.25, 'sawtooth', 0, 0.1);
      tone(220, 0.4, 'sawtooth', 0.2, 0.1);
    },
    win: () => {
      [523, 659, 784, 1047].forEach((frequency, i) => tone(frequency, 0.22, 'triangle', i * 0.12));
    },
  };
  return sound;
}
```

- [ ] **Step 7: HTML 화면을 구현합니다**

`src/ui/menus.ts`
```ts
/** 처음 화면, 결과 화면, 게임 중 버튼. 버튼이 눌리면 넘겨받은 함수를 부르기만 하고 게임 상태를 직접 바꾸지 않습니다. */

export type MenuView =
  | {
      kind: 'title';
      best: number;
      name: string;
      code: string;
      /** 같이 하기에 연결하는 중인지, 쓸 수 있는지, 쓸 수 없는지. */
      multi: 'connecting' | 'ready' | 'none';
      busy: boolean;
      error: string | null;
    }
  | { kind: 'play'; muted: boolean; multi: boolean }
  | { kind: 'soloResult'; score: number; best: number; newBest: boolean };

export interface MenuActions {
  solo(): void;
  create(name: string): void;
  join(code: string, name: string): void;
  retry(): void;
  home(): void;
  quit(): void;
  sound(): void;
}

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  // 다른 사람이 보낸 이름도 여기로 들어오므로 반드시 textContent로 넣습니다.
  if (text) node.textContent = text;
  return node;
}

export function button(label: string, onClick: () => void, className = 'btn'): HTMLButtonElement {
  const node = el('button', className, label);
  node.type = 'button';
  node.addEventListener('click', () => {
    // 초점이 버튼에 남아 있으면 Space가 과일을 놓는 대신 이 버튼을 다시 누르게 됩니다.
    node.blur();
    onClick();
  });
  return node;
}

export function createMenus(root: HTMLElement, actions: MenuActions): { show(view: MenuView): void } {
  const layer = el('div', 'menus');
  root.append(layer);
  let lastKey = '';
  // 화면을 다시 만들어도 입력하던 글자가 사라지지 않게 따로 기억합니다.
  let typedName: string | null = null;
  let typedCode: string | null = null;

  function title(view: Extract<MenuView, { kind: 'title' }>): HTMLElement {
    const panel = el('div', 'panel');
    panel.append(el('h1', 'title', '수박게임'), el('p', 'sub', `최고 점수 ${view.best}`));
    panel.append(button('혼자 하기', actions.solo, 'btn primary'));

    const name = el('input', 'field');
    name.maxLength = 12;
    name.placeholder = '이름';
    name.value = typedName ?? view.name;
    name.addEventListener('input', () => (typedName = name.value));
    const code = el('input', 'field');
    code.maxLength = 80;
    code.placeholder = '방 코드 또는 초대 링크';
    code.autocapitalize = 'off';
    code.value = typedCode ?? view.code;
    code.addEventListener('input', () => (typedCode = code.value));

    const group = el('div', 'group');
    group.append(el('h2', 'heading', '같이 하기'));
    if (view.multi === 'ready') {
      const create = button('방 만들기', () => actions.create(name.value));
      const join = button('코드로 들어가기', () => actions.join(code.value, name.value));
      create.disabled = join.disabled = view.busy;
      group.append(name, create, code, join);
      if (view.busy) group.append(el('p', 'hint', '방에 들어가는 중입니다.'));
    } else if (view.multi === 'connecting') {
      group.append(el('p', 'hint', '같이 하기에 연결하는 중입니다.'));
    } else {
      group.append(el('p', 'hint', '이 환경에서는 같이 하기를 사용할 수 없습니다. 혼자 하기는 그대로 할 수 있습니다.'));
    }
    if (view.error) group.append(el('p', 'error', view.error));
    panel.append(group);
    panel.append(el('p', 'hint', '끌어서 위치를 잡고 손을 떼면 과일이 떨어집니다. 키보드는 ← → 와 Space를 사용합니다.'));
    return panel;
  }

  function play(view: Extract<MenuView, { kind: 'play' }>): HTMLElement {
    const corner = el('div', 'corner');
    corner.append(
      button(view.muted ? '소리 켜기' : '소리 끄기', actions.sound, 'btn small'),
      button(view.multi ? '방 나가기' : '그만하기', actions.quit, 'btn small'),
    );
    return corner;
  }

  function soloResult(view: Extract<MenuView, { kind: 'soloResult' }>): HTMLElement {
    const panel = el('div', 'panel');
    panel.append(el('h1', 'title', '게임 종료'), el('p', 'score', String(view.score)));
    panel.append(el('p', 'sub', view.newBest ? '최고 점수를 새로 세웠습니다.' : `최고 점수 ${view.best}`));
    panel.append(button('다시 하기', actions.retry, 'btn primary'), button('처음으로 가기', actions.home));
    return panel;
  }

  function build(view: MenuView): HTMLElement {
    if (view.kind === 'title') return title(view);
    if (view.kind === 'play') return play(view);
    return soloResult(view);
  }

  return {
    show(view) {
      const key = JSON.stringify(view);
      if (key === lastKey) return;
      lastKey = key;
      layer.replaceChildren(build(view));
    },
  };
}
```

`src/style.css`
```css
html,
body {
  margin: 0;
  height: 100%;
  overflow: hidden;
  background: #fff4dc;
  font-family:
    system-ui,
    'Apple SD Gothic Neo',
    sans-serif;
  color: #5b3a1e;
  overscroll-behavior: none;
}

#app,
#app canvas {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

/* 통 위에서 끌 때 화면이 따라 움직이지 않게 합니다. */
#app canvas {
  touch-action: none;
}

.menus {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  box-sizing: border-box;
  /* 게임 중에는 캔버스가 입력을 받아야 하므로, 화면 요소가 있는 자리만 입력을 받습니다. */
  pointer-events: none;
}

.menus > * {
  pointer-events: auto;
}

.panel {
  width: min(360px, 100%);
  max-height: 100%;
  overflow-y: auto;
  box-sizing: border-box;
  padding: 22px 20px;
  border-radius: 18px;
  border: 3px solid #c98b4a;
  background: #fffaf0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-align: center;
}

.title {
  margin: 0;
  font-size: 28px;
}

.heading {
  margin: 6px 0 0;
  font-size: 15px;
}

.sub,
.hint,
.error {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
}

.hint {
  color: #9a7650;
}

.error {
  color: #c92a2a;
}

.score {
  margin: 0;
  font-size: 44px;
  font-weight: 800;
}

.group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 10px;
  border-top: 2px dashed #e6c9a0;
}

.btn,
.field {
  font: inherit;
  font-size: 16px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 2px solid #c98b4a;
  box-sizing: border-box;
  width: 100%;
}

.btn {
  background: #fff;
  color: #5b3a1e;
  font-weight: 700;
  cursor: pointer;
}

.btn.primary {
  background: #ff922b;
  border-color: #e8590c;
  color: #fff;
}

.btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.btn.small {
  width: auto;
  font-size: 13px;
  padding: 7px 10px;
}

.field {
  background: #fff;
  color: #5b3a1e;
}

.corner {
  position: fixed;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 6px;
}

.rows {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: left;
}

.row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 10px;
  background: #fff;
  border: 2px solid #f0dcbd;
  font-size: 15px;
}

.row.me {
  border-color: #ff922b;
}

.row .tag {
  color: #9a7650;
  white-space: nowrap;
}

.code {
  font-size: 30px;
  font-weight: 800;
  letter-spacing: 4px;
  margin: 0;
}
```

- [ ] **Step 8: 시작점을 구현합니다**

`src/main.ts` (전체 교체)
```ts
import './style.css';
import { createAudio } from './audio';
import { attachInput } from './input';
import { Effects } from './render/effects';
import { computeLayout, toBinX } from './render/layout';
import { drawScene } from './render/scene';
import { Session } from './session';
import { browserStorage, loadBest, loadName, saveBest } from './storage';
import { createMenus, type MenuView } from './ui/menus';

/** 키보드로 위치를 옮기는 속도(통 안의 좌표, 초당). */
const AIM_SPEED = 300;

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('#app이 없습니다.');
const canvas = document.createElement('canvas');
app.append(canvas);
const context = canvas.getContext('2d');
if (!context) throw new Error('Canvas 2D를 사용할 수 없습니다.');
const ctx = context;

const store = browserStorage();
const audio = createAudio();
const effects = new Effects();
const input = attachInput(canvas);

/** 개발 중에만 주소에 ?boost=5를 붙여 큰 과일이 나오게 합니다. 배포용 빌드에서는 항상 0입니다. */
const boost = import.meta.env.DEV
  ? Math.max(0, Math.min(5, Number(new URLSearchParams(window.location.search).get('boost')) || 0))
  : 0;

type Mode = 'title' | 'solo' | 'soloOver';
let mode: Mode = 'title';
let session: Session | null = null;
let best = loadBest(store);
let newBest = false;
let width = 0;
let height = 0;

function startSolo(): void {
  audio.unlock();
  effects.clear();
  session = new Session(Math.floor(Math.random() * 0x7fffffff), { boost });
  newBest = false;
  mode = 'solo';
}

function goHome(): void {
  session = null;
  effects.clear();
  mode = 'title';
}

const menus = createMenus(app, {
  solo: startSolo,
  create: () => undefined,
  join: () => undefined,
  retry: startSolo,
  home: goHome,
  quit: goHome,
  sound: () => audio.toggle(),
});

function view(): MenuView {
  if (mode === 'solo') return { kind: 'play', muted: audio.muted, multi: false };
  if (mode === 'soloOver') return { kind: 'soloResult', score: session?.score ?? 0, best, newBest };
  return { kind: 'title', best, name: loadName(store), code: '', multi: 'none', busy: false, error: null };
}

function resize(): void {
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  if (width !== window.innerWidth || height !== window.innerHeight || canvas.width !== Math.round(width * ratio)) {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
  }
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

let last = performance.now();

function frame(time: number): void {
  const elapsed = Math.max(0, time - last);
  last = time;
  resize();
  const layout = computeLayout(width, height, 0);

  // 게임 중이 아닐 때 들어온 입력이 다음 판으로 넘어가지 않게 매 프레임 읽어서 비웁니다.
  const pointer = input.takePointer();
  const wantDrop = input.takeDrop();

  if (session && mode === 'solo') {
    const axis = input.axis();
    if (axis !== 0) session.aim(session.aimX + (axis * AIM_SPEED * Math.min(elapsed, 100)) / 1000);
    if (pointer !== null) session.aim(toBinX(pointer, layout));
    if (wantDrop && session.drop()) audio.drop();
    for (const merge of session.advance(elapsed).merges) {
      effects.merge(merge);
      audio.merge(merge.from);
    }
    if (session.over) {
      newBest = session.score > best;
      best = saveBest(store, session.score);
      audio.over();
      mode = 'soloOver';
    }
  }
  effects.update(Math.min(elapsed, 100) / 1000);

  const held = session?.held ?? null;
  drawScene(ctx, {
    width,
    height,
    layout,
    fruits: session?.fruits() ?? [],
    held: session && held !== null ? { tier: held, x: session.aimX } : null,
    upcoming: session ? session.upcoming : null,
    score: session?.score ?? 0,
    best,
    overflow: session?.overflowRatio ?? 0,
    effects,
    rivals: [],
    countdown: null,
    note: null,
  });
  menus.show(view());
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
```

- [ ] **Step 9: 테스트와 빌드를 확인합니다**

Run: `npm test && npm run build`
Expected: 모든 테스트 PASS, 빌드 성공. `dist/assets/`에 `.js` 파일 하나와 `.css` 파일 하나만 있어야 합니다(`ls dist/assets`로 확인).

- [ ] **Step 10: 브라우저에서 혼자 하기를 확인합니다**

Run: `npm run dev` (백그라운드로 실행하고 출력된 주소를 엽니다)

확인할 것:
- 처음 화면에 제목, 최고 점수, 혼자 하기 버튼이 보이고, 같이 하기 자리에는 사용할 수 없다는 안내가 보입니다(연결은 Task 11에서 붙입니다).
- 혼자 하기를 누르면 통이 보이고, 마우스를 움직이면 과일이 따라오며, 누른 뒤 떼면 떨어집니다.
- ← → 로 움직이고 Space로 떨어뜨릴 수 있습니다. Space를 누르고 있어도 과일이 하나만 떨어집니다.
- 같은 과일이 닿으면 합쳐지면서 조각과 점수가 보이고 소리가 납니다.
- 쌓인 과일이 눈에 띄게 떨리거나 겹쳐 보이지 않습니다. 떨림이 보이면 `src/physics/world.ts`의 `RESTITUTION`을 낮추거나 `FRICTION`을 높여 조정합니다.
- 주소 뒤에 `?boost=5`를 붙이면 큰 과일이 나와서 수박까지 만들어 볼 수 있습니다.
- 과일을 선 위까지 쌓으면 선이 진해지다가 약 2초 뒤 결과 화면이 나오고, 다시 하기와 처음으로 가기가 동작합니다.
- 페이지를 새로 고쳐도 최고 점수가 남아 있습니다.
- 창을 좁고 길게, 넓고 낮게 바꿔도 통이 화면 안에 들어옵니다.
- 브라우저 콘솔에 오류가 없습니다.

저장된 값을 지워야 할 때는 `localStorage.removeItem('suika-game.best.v1')`만 사용합니다. `localStorage.clear()`는 다른 게임의 저장을 지우므로 사용하지 않습니다.

- [ ] **Step 11: 커밋합니다**

```bash
git add src/storage.ts src/input.ts src/audio.ts src/ui/menus.ts src/style.css src/main.ts tests/storage.test.ts
git commit -m "feat: make solo play work end to end

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

물리 상수를 조정했다면 `src/physics/world.ts`도 `git add`에 포함합니다.

---

### Task 7: 통 요약 (인코딩, 디코딩, 보간)

**Files:**
- Create: `src/game/snapshot.ts`
- Test: `tests/snapshot.test.ts`

**Interfaces:**
- Consumes: `BIN_W`, `BIN_H`, `FRUITS` (`fruits.ts`)
- Produces:
  - `interface BinFruit { x: number; y: number; tier: number }`
  - `MAX_SNAPSHOT_FRUITS = 150`
  - `encodeBin(fruits: readonly BinFruit[]): string` (과일 하나에 5자: x 2자, y 2자, 단계 1자, 36진수)
  - `decodeBin(value: unknown): BinFruit[] | null` (형식이 잘못되면 null)
  - `blendBins(prev: readonly BinFruit[], next: readonly BinFruit[], t: number): BinFruit[]`

- [ ] **Step 1: 실패하는 테스트를 씁니다**

`tests/snapshot.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import { BIN_H, BIN_W } from '../src/game/fruits';
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
        { x: 10, y: 10, tier: 11 },
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
    expect(decodeBin('0000b')).toBeNull();
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
```

- [ ] **Step 2: 테스트가 실패하는지 확인합니다**

Run: `npx vitest run tests/snapshot.test.ts`
Expected: FAIL, `../src/game/snapshot`을 찾을 수 없습니다.

- [ ] **Step 3: 구현합니다**

`src/game/snapshot.ts`
```ts
import { BIN_H, BIN_W, FRUITS } from './fruits';

/** 다른 사람에게 보내는 통 요약의 과일 하나. */
export interface BinFruit {
  x: number;
  y: number;
  tier: number;
}

/** 요약에 담는 과일의 상한. 방의 presence는 전체가 4KiB를 넘으면 안 되므로 길이를 묶어 둡니다. */
export const MAX_SNAPSHOT_FRUITS = 150;
/** 과일 하나를 나타내는 글자 수: x 2자, y 2자, 단계 1자(모두 36진수). */
const CELL = 5;
/** 36진수 두 글자로 나타낼 수 있는 가장 큰 값. */
const RANGE = 36 * 36 - 1;
const PATTERN = /^[0-9a-z]*$/;
/** 두 요약 사이에서 같은 과일로 볼 수 있는 가장 먼 거리. */
const REACH = BIN_W * 0.25;

function pack(value: number, size: number): string {
  const ratio = Number.isFinite(value) ? value / size : 0;
  return Math.max(0, Math.min(RANGE, Math.round(ratio * RANGE)))
    .toString(36)
    .padStart(2, '0');
}

/** 통 안의 과일을 짧은 문자열로 줄입니다. */
export function encodeBin(fruits: readonly BinFruit[]): string {
  let text = '';
  let count = 0;
  for (const fruit of fruits) {
    if (count >= MAX_SNAPSHOT_FRUITS) break;
    if (!Number.isInteger(fruit.tier) || fruit.tier < 0 || fruit.tier >= FRUITS.length) continue;
    text += pack(fruit.x, BIN_W) + pack(fruit.y, BIN_H) + fruit.tier.toString(36);
    count++;
  }
  return text;
}

/** 다른 사람이 보낸 요약을 읽습니다. 형식이 조금이라도 다르면 null을 돌려주어 쓰지 않게 합니다. */
export function decodeBin(value: unknown): BinFruit[] | null {
  if (typeof value !== 'string') return null;
  if (value.length % CELL !== 0 || value.length > MAX_SNAPSHOT_FRUITS * CELL || !PATTERN.test(value)) return null;
  const fruits: BinFruit[] = [];
  for (let i = 0; i < value.length; i += CELL) {
    const tier = parseInt(value[i + 4], 36);
    if (tier >= FRUITS.length) return null;
    fruits.push({
      x: (parseInt(value.slice(i, i + 2), 36) / RANGE) * BIN_W,
      y: (parseInt(value.slice(i + 2, i + 4), 36) / RANGE) * BIN_H,
      tier,
    });
  }
  return fruits;
}

/**
 * 직전 요약과 새 요약 사이를 보간합니다. 요약에는 과일의 번호가 없으므로,
 * 같은 단계이면서 가장 가까운 과일끼리 같은 과일로 보고 잇습니다.
 */
export function blendBins(prev: readonly BinFruit[], next: readonly BinFruit[], t: number): BinFruit[] {
  const k = Number.isFinite(t) ? Math.max(0, Math.min(1, t)) : 1;
  if (k >= 1 || prev.length === 0) return next.map((fruit) => ({ ...fruit }));
  const used = new Array<boolean>(prev.length).fill(false);
  return next.map((fruit) => {
    let best = -1;
    let bestDistance = REACH * REACH;
    for (let j = 0; j < prev.length; j++) {
      const candidate = prev[j];
      if (used[j] || candidate.tier !== fruit.tier) continue;
      const distance = (candidate.x - fruit.x) ** 2 + (candidate.y - fruit.y) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = j;
      }
    }
    if (best < 0) return { ...fruit };
    used[best] = true;
    const from = prev[best];
    return { x: from.x + (fruit.x - from.x) * k, y: from.y + (fruit.y - from.y) * k, tier: fruit.tier };
  });
}
```

- [ ] **Step 4: 테스트가 통과하는지 확인합니다**

Run: `npx vitest run tests/snapshot.test.ts`
Expected: 8개 PASS

- [ ] **Step 5: 커밋합니다**

```bash
git add src/game/snapshot.ts tests/snapshot.test.ts
git commit -m "feat: encode, validate and blend bin snapshots

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: 방 규칙 (방 코드, 상태 읽기, 방장, 순위, 승패)

**Files:**
- Create: `src/game/match.ts`
- Test: `tests/match.test.ts`

**Interfaces:**
- Consumes: `decodeBin`, `BinFruit` (`snapshot.ts`), `WATERMELON` (`fruits.ts`)
- Produces:
  - `ROOM_CODE_LENGTH = 5`, `NAME_LIMIT = 12`, `MAX_PLAYERS = 4`
  - `makeRoomCode(rand: () => number): string`, `parseRoomCode(text: string): string | null`, `roomName(code: string): string` (`sk-코드`), `cleanName(value: unknown, fallback?: string): string`
  - `type PlayState = 'play' | 'out' | 'win'`
  - `interface Player { peer: string; name: string; owner: boolean; since: number; phase: 'wait' | 'play'; ready: boolean; game: string | null; seed: number; score: number; top: number; state: PlayState; winTicks: number | null; bin: BinFruit[]; beat: number }`
  - `readPlayer(peer: string, presence: Readonly<Record<string, unknown>>): Player`
  - presence의 키 이름: `name`, `owner`, `since`, `phase`, `ready`, `game`, `seed`, `score`, `top`, `st`(상태), `wt`(수박까지 걸린 걸음), `b`(통 요약), `n`(보낸 번호)
  - `pickHost(players: readonly Pick<Player, 'peer' | 'since' | 'owner'>[]): string | null`
  - `seats<T extends Pick<Player, 'peer' | 'since' | 'owner'>>(players: readonly T[]): T[]` (방장 순서로 정렬)
  - `canStart(players: readonly Pick<Player, 'peer' | 'ready' | 'phase'>[], host: string | null): boolean`
  - `interface Entry { peer: string; score: number; state: PlayState; winTicks: number | null }`
  - `rank<T extends Entry>(entries: readonly T[]): T[]`, `judge(entries: readonly Entry[]): { over: boolean; winner: string | null }`

- [ ] **Step 1: 실패하는 테스트를 씁니다**

`tests/match.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../src/game/random';
import {
  MAX_PLAYERS,
  canStart,
  cleanName,
  judge,
  makeRoomCode,
  parseRoomCode,
  pickHost,
  rank,
  readPlayer,
  roomName,
  seats,
  type Entry,
} from '../src/game/match';

describe('방 코드', () => {
  it('헷갈리는 글자가 없는 다섯 글자 코드를 만듭니다', () => {
    const rand = mulberry32(5);
    for (let i = 0; i < 200; i++) {
      const code = makeRoomCode(rand);
      expect(code).toMatch(/^[abcdefghjkmnpqrstuvwxyz23456789]{5}$/);
      expect(parseRoomCode(code)).toBe(code);
    }
  });

  it('입력한 글자나 초대 링크에서 코드를 꺼냅니다', () => {
    expect(parseRoomCode('  AB2CD ')).toBe('ab2cd');
    expect(parseRoomCode('https://example.com/game/#ab2cd')).toBe('ab2cd');
    expect(parseRoomCode('ab2c')).toBeNull();
    expect(parseRoomCode('ab2cdx')).toBeNull();
    expect(parseRoomCode('ab1cd')).toBeNull();
    expect(parseRoomCode('')).toBeNull();
  });

  it('방 이름은 room 기능이 허용하는 형식입니다', () => {
    expect(roomName('ab2cd')).toBe('sk-ab2cd');
    expect(roomName('ab2cd')).toMatch(/^[a-z0-9][a-z0-9_.-]{0,47}$/);
  });
});

describe('다른 사람이 보낸 값 읽기', () => {
  it('이름에서 제어 문자와 보이지 않는 글자를 지우고 12자로 줄입니다', () => {
    expect(cleanName('  가나\u0000다​  ')).toBe('가나다');
    expect(cleanName('가나다라마바사아자차카타파하')).toBe('가나다라마바사아자차카타');
    expect(cleanName('   ')).toBe('플레이어');
    expect(cleanName(123)).toBe('플레이어');
  });

  it('비어 있는 값은 대기실의 기본 상태로 읽습니다', () => {
    const player = readPlayer('p1', {});
    expect(player).toEqual({
      peer: 'p1',
      name: '플레이어',
      owner: false,
      since: Number.MAX_SAFE_INTEGER,
      phase: 'wait',
      ready: false,
      game: null,
      seed: 0,
      score: 0,
      top: 0,
      state: 'play',
      winTicks: null,
      bin: [],
      beat: 0,
    });
  });

  it('올바른 값은 그대로 읽습니다', () => {
    const player = readPlayer('p1', {
      name: '건우',
      owner: true,
      since: 100,
      phase: 'play',
      ready: true,
      game: 'abcde1',
      seed: 777,
      score: 345,
      top: 7,
      st: 'win',
      wt: 5400,
      b: '0000100002',
      n: 12,
    });
    expect(player.name).toBe('건우');
    expect(player.owner).toBe(true);
    expect(player.phase).toBe('play');
    expect(player.game).toBe('abcde1');
    expect(player.seed).toBe(777);
    expect(player.score).toBe(345);
    expect(player.top).toBe(7);
    expect(player.state).toBe('win');
    expect(player.winTicks).toBe(5400);
    expect(player.bin).toHaveLength(2);
    expect(player.beat).toBe(12);
  });

  it('형식이나 범위가 잘못된 값은 안전한 값으로 바꿉니다', () => {
    const player = readPlayer('p1', {
      name: { evil: true },
      owner: 'yes',
      since: 'now',
      phase: 'hack',
      ready: 1,
      game: '<script>',
      seed: -5.5,
      score: Number.NaN,
      top: 99,
      st: 'god',
      wt: 10,
      b: '<<<<<',
      n: Number.POSITIVE_INFINITY,
    });
    expect(player.name).toBe('플레이어');
    expect(player.owner).toBe(false);
    expect(player.since).toBe(Number.MAX_SAFE_INTEGER);
    expect(player.phase).toBe('wait');
    expect(player.ready).toBe(false);
    expect(player.game).toBeNull();
    expect(player.seed).toBe(0);
    expect(player.score).toBe(0);
    expect(player.top).toBe(10);
    expect(player.state).toBe('play');
    expect(player.winTicks).toBeNull();
    expect(player.bin).toEqual([]);
    expect(player.beat).toBe(0);
  });

  it('음수 점수는 0으로, 수박을 만들었다면서 걸린 시간이 없으면 가장 늦은 것으로 봅니다', () => {
    expect(readPlayer('p', { score: -30 }).score).toBe(0);
    expect(readPlayer('p', { st: 'win' }).winTicks).toBe(Number.MAX_SAFE_INTEGER);
    expect(readPlayer('p', { st: 'win', wt: -3 }).winTicks).toBe(Number.MAX_SAFE_INTEGER);
  });
});

describe('방장과 시작', () => {
  it('방을 만든 사람이 방장이고, 없으면 가장 먼저 들어온 사람입니다', () => {
    expect(pickHost([])).toBeNull();
    expect(
      pickHost([
        { peer: 'b', since: 1, owner: false },
        { peer: 'a', since: 9, owner: true },
      ]),
    ).toBe('a');
    expect(
      pickHost([
        { peer: 'b', since: 5, owner: false },
        { peer: 'c', since: 2, owner: false },
      ]),
    ).toBe('c');
    expect(
      pickHost([
        { peer: 'z', since: 2, owner: false },
        { peer: 'c', since: 2, owner: false },
      ]),
    ).toBe('c');
  });

  it('자리는 방장 순서로 정합니다', () => {
    const order = seats([
      { peer: 'c', since: 3, owner: false },
      { peer: 'a', since: 9, owner: true },
      { peer: 'b', since: 1, owner: false },
    ]).map((p) => p.peer);
    expect(order).toEqual(['a', 'b', 'c']);
  });

  it('두 명 이상이고 방장을 뺀 모두가 대기실에서 준비했을 때만 시작할 수 있습니다', () => {
    const host = { peer: 'h', ready: false, phase: 'wait' as const };
    const ready = { peer: 'g', ready: true, phase: 'wait' as const };
    expect(canStart([host], 'h')).toBe(false);
    expect(canStart([host, ready], 'h')).toBe(true);
    expect(canStart([host, ready, { peer: 'x', ready: false, phase: 'wait' }], 'h')).toBe(false);
    expect(canStart([host, { peer: 'g', ready: true, phase: 'play' }], 'h')).toBe(false);
    expect(canStart([host, ready], null)).toBe(false);
    const crowd = Array.from({ length: MAX_PLAYERS }, (_, i) => ({ peer: `g${i}`, ready: true, phase: 'wait' as const }));
    expect(canStart([host, ...crowd], 'h')).toBe(false);
  });
});

describe('승패', () => {
  const entry = (peer: string, state: Entry['state'], score: number, winTicks: number | null = null): Entry => ({
    peer,
    state,
    score,
    winTicks,
  });

  it('아무도 수박을 만들지 못했고 누군가 진행 중이면 끝나지 않습니다', () => {
    expect(judge([entry('a', 'play', 10), entry('b', 'out', 500)])).toEqual({ over: false, winner: null });
    expect(judge([])).toEqual({ over: false, winner: null });
  });

  it('수박을 만든 사람이 있으면 즉시 끝나고 그 사람이 이깁니다', () => {
    expect(judge([entry('a', 'play', 900), entry('b', 'win', 300, 4000)])).toEqual({ over: true, winner: 'b' });
  });

  it('둘 이상이 수박을 만들었으면 더 적은 걸음에 만든 사람이 이깁니다', () => {
    const entries = [entry('a', 'win', 300, 4100), entry('b', 'win', 300, 4000), entry('c', 'play', 999)];
    expect(judge(entries).winner).toBe('b');
    expect(rank(entries).map((e) => e.peer)).toEqual(['b', 'a', 'c']);
  });

  it('걸음까지 같으면 점수가 높은 사람이, 점수도 같으면 이름표 순서로 정합니다', () => {
    expect(judge([entry('a', 'win', 300, 4000), entry('b', 'win', 310, 4000)]).winner).toBe('b');
    expect(judge([entry('b', 'win', 300, 4000), entry('a', 'win', 300, 4000)]).winner).toBe('a');
  });

  it('모두 탈락하면 점수가 높은 순서로 순위를 매깁니다', () => {
    const entries = [entry('a', 'out', 100), entry('b', 'out', 250), entry('c', 'out', 180)];
    expect(judge(entries)).toEqual({ over: true, winner: 'b' });
    expect(rank(entries).map((e) => e.peer)).toEqual(['b', 'c', 'a']);
  });

  it('혼자 남은 사람이 진행 중이면 계속합니다', () => {
    expect(judge([entry('a', 'play', 10), entry('b', 'out', 50), entry('c', 'out', 70)]).over).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인합니다**

Run: `npx vitest run tests/match.test.ts`
Expected: FAIL, `../src/game/match`를 찾을 수 없습니다.

- [ ] **Step 3: 구현합니다**

`src/game/match.ts`
```ts
/** 여럿이 함께 하기 위한 규칙. 방 코드, 다른 사람의 상태 읽기, 방장 정하기, 순위와 승패 계산을 맡습니다. */
import { WATERMELON } from './fruits';
import { decodeBin, type BinFruit } from './snapshot';

const CODE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
export const ROOM_CODE_LENGTH = 5;
const CODE_PATTERN = new RegExp(`^[${CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`);
const GAME_PATTERN = /^[a-z0-9]{1,16}$/;
export const NAME_LIMIT = 12;
/** 한 방에 들어올 수 있는 최대 인원. */
export const MAX_PLAYERS = 4;
const MAX_SCORE = 9_999_999;

/** 헷갈리는 글자(0, o, 1, l, i)를 뺀 다섯 글자 방 코드를 만듭니다. */
export function makeRoomCode(rand: () => number): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) code += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)];
  return code;
}

/** 입력한 글자나 초대 링크에서 방 코드를 꺼냅니다. 올바른 코드가 없으면 null입니다. */
export function parseRoomCode(text: string): string | null {
  const tail = text.trim().toLowerCase().split('#').pop() ?? '';
  return CODE_PATTERN.test(tail) ? tail : null;
}

export function roomName(code: string): string {
  return `sk-${code}`;
}

/** 다른 사람이 보낸 이름을 화면에 쓸 수 있게 다듬습니다. 제어 문자와 보이지 않는 글자를 지우고 길이를 줄입니다. */
export function cleanName(value: unknown, fallback = '플레이어'): string {
  if (typeof value !== 'string') return fallback;
  // eslint-disable-next-line no-control-regex
  const text = value.replace(/[\u0000-\u001f\u007f-\u009f​-‏ -‮⁠-⁯]/g, '').trim();
  return text ? Array.from(text).slice(0, NAME_LIMIT).join('') : fallback;
}

/** 판 안에서의 상태: 진행 중, 탈락, 수박 완성. */
export type PlayState = 'play' | 'out' | 'win';

/** 방 안에서 한 사람이 알리는 상태. */
export interface Player {
  peer: string;
  name: string;
  /** 방을 만든 사람인지 여부. 방을 만든 사람이 있으면 그 사람이 방장입니다. */
  owner: boolean;
  /** 방에 들어온 시각(그 사람의 시계). 방을 만든 사람이 나가면 가장 먼저 들어온 사람이 방장입니다. */
  since: number;
  /** 'wait'는 대기실, 'play'는 판에 참가한 상태(시작 전 숫자 세기와 결과 화면 포함)입니다. */
  phase: 'wait' | 'play';
  ready: boolean;
  /** 참가한 판의 이름. 판을 시작할 때마다 방장이 새로 정합니다. */
  game: string | null;
  /** 과일 순서를 정하는 시드. 방장의 값만 씁니다. */
  seed: number;
  score: number;
  top: number;
  state: PlayState;
  /** 수박을 만들기까지 걸린 걸음. 수박을 만들지 않았으면 null입니다. */
  winTicks: number | null;
  bin: BinFruit[];
  /** 보낼 때마다 1씩 커지는 번호. 이 값이 바뀌는지를 보고 연결이 살아 있는지 판단합니다. */
  beat: number;
}

const num = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const whole = (value: unknown, max: number): number => Math.max(0, Math.min(max, Math.floor(num(value))));

/** 다른 사람이 보낸 상태를 믿지 않고, 값마다 형식과 범위를 확인해서 읽습니다. */
export function readPlayer(peer: string, presence: Readonly<Record<string, unknown>>): Player {
  const state: PlayState = presence.st === 'win' ? 'win' : presence.st === 'out' ? 'out' : 'play';
  const ticks = num(presence.wt, -1);
  return {
    peer,
    name: cleanName(presence.name),
    owner: presence.owner === true,
    since: num(presence.since, Number.MAX_SAFE_INTEGER),
    phase: presence.phase === 'play' ? 'play' : 'wait',
    ready: presence.ready === true,
    game: typeof presence.game === 'string' && GAME_PATTERN.test(presence.game) ? presence.game : null,
    seed: whole(presence.seed, 0x7fffffff),
    score: whole(presence.score, MAX_SCORE),
    top: whole(presence.top, WATERMELON),
    state,
    // 수박을 만들었다면서 걸린 걸음이 없으면, 제대로 보낸 사람보다 앞서지 못하게 가장 늦은 것으로 봅니다.
    winTicks: state !== 'win' ? null : ticks > 0 ? Math.floor(ticks) : Number.MAX_SAFE_INTEGER,
    bin: decodeBin(presence.b) ?? [],
    beat: whole(presence.n, Number.MAX_SAFE_INTEGER),
  };
}

type Seat = Pick<Player, 'peer' | 'since' | 'owner'>;

/**
 * 방장이 되는 순서. 방을 만든 사람이 가장 앞이고, 그다음은 먼저 들어온 순서입니다.
 * 시각이 같으면 이름표 순서로 정해서, 모두가 같은 사람을 고릅니다.
 */
function seatOrder(a: Seat, b: Seat): number {
  if (a.owner !== b.owner) return a.owner ? -1 : 1;
  if (a.since !== b.since) return a.since < b.since ? -1 : 1;
  return a.peer < b.peer ? -1 : a.peer > b.peer ? 1 : 0;
}

export function seats<T extends Seat>(players: readonly T[]): T[] {
  return [...players].sort(seatOrder);
}

export function pickHost(players: readonly Seat[]): string | null {
  return seats(players)[0]?.peer ?? null;
}

/** 방장이 판을 시작할 수 있는지 여부. 두 명 이상이고, 방장을 뺀 모두가 대기실에서 준비해야 합니다. */
export function canStart(players: readonly Pick<Player, 'peer' | 'ready' | 'phase'>[], host: string | null): boolean {
  if (host === null) return false;
  const guests = players.filter((player) => player.peer !== host);
  if (guests.length === 0 || guests.length > MAX_PLAYERS - 1) return false;
  return guests.every((player) => player.ready && player.phase === 'wait');
}

/** 승패를 가릴 때 쓰는 한 사람의 결과. */
export interface Entry {
  peer: string;
  score: number;
  state: PlayState;
  winTicks: number | null;
}

/** 순위. 수박을 만든 사람이 앞이고(적은 걸음 순서), 나머지는 점수가 높은 순서입니다. */
export function rank<T extends Entry>(entries: readonly T[]): T[] {
  return [...entries].sort((a, b) => {
    const wonA = a.state === 'win';
    const wonB = b.state === 'win';
    if (wonA !== wonB) return wonA ? -1 : 1;
    if (wonA && wonB) {
      const ticksA = a.winTicks ?? Number.MAX_SAFE_INTEGER;
      const ticksB = b.winTicks ?? Number.MAX_SAFE_INTEGER;
      if (ticksA !== ticksB) return ticksA - ticksB;
    }
    if (a.score !== b.score) return b.score - a.score;
    return a.peer < b.peer ? -1 : a.peer > b.peer ? 1 : 0;
  });
}

/** 판이 끝났는지와 이긴 사람. 누군가 수박을 만들었거나 모두 탈락했으면 끝납니다. */
export function judge(entries: readonly Entry[]): { over: boolean; winner: string | null } {
  if (entries.length === 0) return { over: false, winner: null };
  const anyWin = entries.some((entry) => entry.state === 'win');
  const allDone = entries.every((entry) => entry.state !== 'play');
  if (!anyWin && !allDone) return { over: false, winner: null };
  return { over: true, winner: rank(entries)[0].peer };
}
```

- [ ] **Step 4: 테스트가 통과하는지 확인합니다**

Run: `npx vitest run tests/match.test.ts`
Expected: 17개 PASS

- [ ] **Step 5: 커밋합니다**

```bash
git add src/game/match.ts tests/match.test.ts
git commit -m "feat: add room codes, presence parsing, host and ranking rules

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: 연결 계층 (Retro Racer에서 가져오기)

**Files:**
- Create: `src/net/types.ts`, `src/net/p2p-room.ts`, `src/net/peer-key.ts`, `src/net/connect.ts`, `.env.web`
- Test: `tests/p2p-room.test.ts`

**Interfaces:**
- Produces:
  - `types.ts`: `PeerLike { peer: string; sameTab: boolean; kind: string; presence: Readonly<Record<string, unknown>>; updatedAt: number }`, `RoomLike { presence(patch): Promise<void>; peers(): readonly PeerLike[]; onPeers(handler, onError?): () => void }`, `NamedRoomLike extends RoomLike { leave(): Promise<void> }`, `LobbyLike extends RoomLike { listsRooms?: boolean; join(name: string): Promise<NamedRoomLike> }`
  - `p2p-room.ts`: `P2PRoom`, `createP2PLobby(make: NodeMaker, key: string): LobbyLike`, `hostIdFor(name: string): string`, `NodeLike`, `ConnLike`
  - `peer-key.ts`: `makePeerKey(rand?: () => number): string`
  - `connect.ts`: `interface Connection { lobby: LobbyLike | null; inviteBase: string; via: 'claude' | 'p2p' | 'none' }`, `connect(): Promise<Connection>`

`types.ts`, `p2p-room.ts`와 그 테스트는 형제 프로젝트에서 이미 검증된 코드이므로 그대로 복사하고, 게임 이름이 들어간 문자열만 바꿉니다.

- [ ] **Step 1: 파일을 복사하고 이름표의 앞부분을 바꿉니다**

```bash
mkdir -p src/net
cp ../retro-racer/src/net/types.ts src/net/types.ts
cp ../retro-racer/src/net/p2p-room.ts src/net/p2p-room.ts
cp ../retro-racer/tests/p2p-room.test.ts tests/p2p-room.test.ts
sed -i '' 's/retro-racer-/suika-game-/' src/net/p2p-room.ts tests/p2p-room.test.ts
sed -i '' 's/claude.ai의 room 기능과 Supabase 연결이 같은 모양을 따릅니다./claude.ai의 room 기능과 P2P 연결이 같은 모양을 따릅니다./' src/net/types.ts
grep -n "suika-game-" src/net/p2p-room.ts tests/p2p-room.test.ts
grep -rn "retro-racer\|Supabase" src/net tests/p2p-room.test.ts
```

Expected: 첫 번째 grep이 `src/net/p2p-room.ts`와 `tests/p2p-room.test.ts`에서 한 줄씩 찾고, 두 번째 grep은 아무것도 찾지 못합니다. 두 번째 grep에 결과가 남아 있으면 그 줄을 직접 고칩니다.

- [ ] **Step 2: 복사한 테스트가 통과하는지 확인합니다**

Run: `npx vitest run tests/p2p-room.test.ts`
Expected: 복사한 테스트 전체 PASS

- [ ] **Step 3: 이름표 만들기와 연결을 구현합니다**

`src/net/peer-key.ts`
```ts
/** 브라우저 탭마다 하나씩 쓰는 이름표. */
export function makePeerKey(rand: () => number = Math.random): string {
  let key = '';
  for (let i = 0; i < 16; i++) key += 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(rand() * 36)];
  return key;
}
```

`src/net/connect.ts`
```ts
import type { LobbyLike } from './types';

/**
 * claude.ai에 게시한 게임 링크. 그 안에서 열었을 때 초대 링크는 이 주소 뒤에 #방코드를 붙입니다.
 * 게시한 뒤에 채웁니다. 비어 있으면 초대할 때 방 코드만 보여 줍니다.
 */
const CLAUDE_GAME_URL = '';

export interface Connection {
  lobby: LobbyLike | null;
  /** 초대 링크의 앞부분. 이 뒤에 #방코드를 붙입니다. 비어 있으면 방 코드만 알려 줍니다. */
  inviteBase: string;
  /** 어떤 방식으로 연결했는지. 'claude'는 claude.ai의 room 기능, 'p2p'는 공개 사이트입니다. */
  via: 'claude' | 'p2p' | 'none';
}

/**
 * 방 기능에 연결합니다. claude.ai 안에서 열었으면 그 room 기능을 쓰고,
 * 공개 사이트용으로 빌드했으면 브라우저끼리 직접 연결합니다. 둘 다 아니면 혼자 하기만 됩니다.
 */
export async function connect(): Promise<Connection> {
  const claude = (window as unknown as { claude?: { use(name: string): Promise<unknown> } }).claude;
  if (claude?.use) {
    // 연결할 수 없는 환경이면 최대 10초 뒤에 null이 옵니다.
    const lobby = (await claude.use('room').catch(() => null)) as LobbyLike | null;
    return { lobby, inviteBase: CLAUDE_GAME_URL, via: lobby ? 'claude' : 'none' };
  }

  const here = `${window.location.origin}${window.location.pathname}`;
  if (import.meta.env.VITE_NET === 'p2p') {
    try {
      const [{ Peer }, { createP2PLobby }, { makePeerKey }] = await Promise.all([
        import('peerjs'),
        import('./p2p-room'),
        import('./peer-key'),
      ]);
      const make = (id?: string) => (id ? new Peer(id) : new Peer()) as unknown as import('./p2p-room').NodeLike;
      return { lobby: createP2PLobby(make, makePeerKey()), inviteBase: here, via: 'p2p' };
    } catch {
      return { lobby: null, inviteBase: here, via: 'none' };
    }
  }
  return { lobby: null, inviteBase: here, via: 'none' };
}
```

`.env.web`
```
# 공개 사이트용 빌드(npm run build:web) 설정입니다. 비밀 값은 없습니다.
# p2p: 브라우저끼리 직접 연결합니다. 별도 서버나 계정이 필요 없어서 GitHub Pages에 그대로 올릴 수 있습니다.
VITE_NET=p2p
```

- [ ] **Step 4: 타입 검사와 두 가지 빌드를 확인합니다**

Run: `npx tsc --noEmit && npm run build && ls dist/assets && npm run build:web`
Expected: 타입 오류 없음. 두 빌드 모두 성공. `connect.ts`는 아직 `main.ts`에서 불러오지 않으므로 `dist/assets`에는 `.js` 하나와 `.css` 하나만 있습니다.

- [ ] **Step 5: 커밋합니다**

```bash
git add src/net/types.ts src/net/p2p-room.ts src/net/peer-key.ts src/net/connect.ts .env.web tests/p2p-room.test.ts
git commit -m "feat: bring in room interfaces and P2P adapter from retro-racer

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: 대기실과 대전의 상태 기계

**Files:**
- Create: `src/multiplayer.ts`
- Test: `tests/multiplayer.test.ts`

**Interfaces:**
- Consumes: `LobbyLike`, `NamedRoomLike` (`net/types.ts`); `readPlayer`, `pickHost`, `seats`, `canStart`, `judge`, `rank`, `makeRoomCode`, `parseRoomCode`, `roomName`, `cleanName`, `MAX_PLAYERS`, `Player`, `PlayState`, `Entry` (`match.ts`); `encodeBin`, `blendBins`, `BinFruit` (`snapshot.ts`)
- Produces:
  - 상수: `SEND_INTERVAL = 125`, `COUNTDOWN_MS = 3000`, `SETTLE_MS = 2000`, `STALE_MS = 3000`, `GONE_MS = 10000`
  - `type Stage = 'idle' | 'joining' | 'lobby' | 'countdown' | 'playing' | 'result'`
  - `interface LocalStatus { score: number; top: number; state: PlayState; winTicks: number | null; fruits: readonly BinFruit[] }`
  - `interface LobbyRow { name: string; host: boolean; ready: boolean; me: boolean; busy: boolean }`
  - `interface LobbyView { code: string; invite: string; rows: LobbyRow[]; isHost: boolean; ready: boolean; canStart: boolean; settled: boolean }`
  - `interface RivalView { peer: string; name: string; score: number; top: number; state: PlayState; stale: boolean; fruits: BinFruit[] }`
  - `interface ResultRow { name: string; score: number; state: PlayState; me: boolean; winner: boolean }`
  - `class Multiplayer`:
    - `constructor(lobby: LobbyLike | null, inviteBase: string, hooks: { onStage(stage: Stage): void }, now?: () => number, random?: () => number)`
    - 읽기 전용 값: `stage: Stage`, `error: string | null`, `code: string`, `seed: number`
    - `create(name: string): Promise<void>`, `join(text: string, name: string): Promise<void>`, `leave(message?: string | null): void`
    - `toggleReady(): void`, `start(): void`, `backToLobby(): void`
    - `report(status: LocalStatus): void`, `update(): void`
    - `countdownLeft(): number`, `lobbyView(): LobbyView | null`, `rivals(): RivalView[]`, `resultRows(): ResultRow[]`

동작 요약:
- 방에 들어간 뒤 `SETTLE_MS` 동안은 다른 사람의 상태가 아직 도착하지 않았을 수 있으므로, 방장 권한을 쓰지 않고 방이 비었는지도 판단하지 않습니다.
- 방장이 시작하면 자기 presence의 `phase`를 `'play'`로, `game`을 새 이름으로 바꿉니다. 준비한 사람은 방장의 `game`이 새 값으로 바뀐 것을 보고 같은 판에 참가합니다.
- 판이 진행되는 동안 `SEND_INTERVAL`마다 자기 상태를 보내고, 상태(`state`)가 바뀌었을 때는 간격을 기다리지 않고 바로 보냅니다.
- 같은 판에 참가한 사람을 기억해 둡니다. 방에서 사라졌거나 `GONE_MS` 동안 보낸 번호가 바뀌지 않으면 탈락으로 봅니다.
- 결과 화면에서는 각자 `backToLobby()`로 대기실에 돌아갑니다.
- 순위를 가를 때 점수와 걸음까지 같으면 이름표 순서로 정합니다. 모든 화면이 같은 결과를 내도록, 내 항목에도 방이 붙여 준 내 이름표(`myPeer`)를 씁니다.

- [ ] **Step 1: 실패하는 테스트를 씁니다**

`tests/multiplayer.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../src/game/random';
import { COUNTDOWN_MS, GONE_MS, Multiplayer, SETTLE_MS, STALE_MS, type LocalStatus, type Stage } from '../src/multiplayer';
import type { LobbyLike, NamedRoomLike, PeerLike } from '../src/net/types';

type Member = { presence: Record<string, unknown>; updatedAt: number };

/** 메모리 안에서만 동작하는 방. 시계를 직접 움직여서 시간에 따른 동작을 확인합니다. */
class FakeHub {
  now = 1000;
  readonly rooms = new Map<string, Map<string, Member>>();

  lobby(peer: string): LobbyLike {
    const hub = this;
    return {
      presence: () => Promise.resolve(),
      peers: () => [],
      onPeers: () => () => undefined,
      join(name: string): Promise<NamedRoomLike> {
        const members = hub.rooms.get(name) ?? new Map<string, Member>();
        hub.rooms.set(name, members);
        members.set(peer, { presence: {}, updatedAt: hub.now });
        return Promise.resolve({
          presence(patch: Record<string, unknown>): Promise<void> {
            const entry = members.get(peer);
            if (!entry) return Promise.resolve();
            const next = { ...entry.presence };
            for (const [key, value] of Object.entries(patch)) {
              if (value === null) delete next[key];
              else next[key] = value;
            }
            members.set(peer, { presence: next, updatedAt: hub.now });
            return Promise.resolve();
          },
          peers: (): PeerLike[] =>
            [...members].map(([key, entry]) => ({
              peer: key,
              sameTab: key === peer,
              kind: 'viewer',
              presence: entry.presence,
              updatedAt: entry.updatedAt,
            })),
          onPeers: () => () => undefined,
          leave(): Promise<void> {
            members.delete(peer);
            return Promise.resolve();
          },
        });
      },
    };
  }

  /** 탭을 닫은 것처럼 방에서 바로 지웁니다. */
  drop(peer: string): void {
    for (const members of this.rooms.values()) members.delete(peer);
  }
}

interface Client {
  mp: Multiplayer;
  stages: Stage[];
}

function client(hub: FakeHub, peer: string, seed = 1): Client {
  const stages: Stage[] = [];
  const mp = new Multiplayer(
    hub.lobby(peer),
    'https://example.com/',
    { onStage: (stage) => stages.push(stage) },
    () => hub.now,
    mulberry32(seed),
  );
  return { mp, stages };
}

function pass(hub: FakeHub, ms: number, ...clients: Client[]): void {
  const step = 50;
  for (let t = 0; t < ms; t += step) {
    hub.now += step;
    for (const c of clients) c.mp.update();
  }
}

const status = (patch: Partial<LocalStatus> = {}): LocalStatus => ({
  score: 0,
  top: 0,
  state: 'play',
  winTicks: null,
  fruits: [],
  ...patch,
});

/** 방장과 손님 한 명이 판을 시작해 진행 중인 상태까지 만듭니다. */
async function startedPair(hub: FakeHub): Promise<{ host: Client; guest: Client }> {
  const host = client(hub, 'host', 1);
  const guest = client(hub, 'guest', 2);
  await host.mp.create('방장');
  hub.now += 10;
  await guest.mp.join(host.mp.code, '손님');
  pass(hub, SETTLE_MS + 100, host, guest);
  guest.mp.toggleReady();
  pass(hub, 100, host, guest);
  host.mp.start();
  pass(hub, 100, host, guest);
  pass(hub, COUNTDOWN_MS, host, guest);
  return { host, guest };
}

describe('방에 들어가기', () => {
  it('방 기능이 없으면 안내를 남기고 들어가지 않습니다', async () => {
    const mp = new Multiplayer(null, '', { onStage: () => undefined });
    await mp.create('가');
    expect(mp.stage).toBe('idle');
    expect(mp.error).toBe('이 환경에서는 같이 하기를 사용할 수 없습니다.');
  });

  it('방 코드가 올바르지 않으면 들어가지 않습니다', async () => {
    const hub = new FakeHub();
    const guest = client(hub, 'guest');
    await guest.mp.join('???', '손님');
    expect(guest.mp.stage).toBe('idle');
    expect(guest.mp.error).toBe('방 코드를 다시 확인해 주세요.');
  });

  it('아무도 없는 방 코드로 들어가면 잠시 뒤 안내와 함께 나옵니다', async () => {
    const hub = new FakeHub();
    const guest = client(hub, 'guest');
    await guest.mp.join('abcde', '손님');
    expect(guest.mp.stage).toBe('lobby');
    pass(hub, SETTLE_MS + 100, guest);
    expect(guest.mp.stage).toBe('idle');
    expect(guest.mp.error).toBe('방을 찾을 수 없습니다. 방 코드를 다시 확인해 주세요.');
  });

  it('방을 만든 사람은 혼자 있어도 대기실에 머뭅니다', async () => {
    const hub = new FakeHub();
    const host = client(hub, 'host');
    await host.mp.create('방장');
    pass(hub, SETTLE_MS + 500, host);
    expect(host.mp.stage).toBe('lobby');
    const view = host.mp.lobbyView();
    expect(view?.isHost).toBe(true);
    expect(view?.canStart).toBe(false);
    expect(view?.invite).toBe(`https://example.com/#${host.mp.code}`);
    expect(view?.rows).toEqual([{ name: '방장', host: true, ready: false, me: true, busy: false }]);
  });

  it('다섯 번째로 들어온 사람은 방이 가득 찼다는 안내와 함께 나옵니다', async () => {
    const hub = new FakeHub();
    const host = client(hub, 'p0');
    await host.mp.create('방장');
    const others: Client[] = [];
    for (let i = 1; i <= 4; i++) {
      hub.now += 10;
      const c = client(hub, `p${i}`, i + 1);
      await c.mp.join(host.mp.code, `손님${i}`);
      others.push(c);
    }
    pass(hub, SETTLE_MS + 100, host, ...others);
    expect(others.slice(0, 3).map((c) => c.mp.stage)).toEqual(['lobby', 'lobby', 'lobby']);
    expect(others[3].mp.stage).toBe('idle');
    expect(others[3].mp.error).toBe('방이 가득 찼습니다.');
  });

  it('손님이 남아 있는데 방장이 나가면 먼저 들어온 사람이 방장이 됩니다', async () => {
    const hub = new FakeHub();
    const host = client(hub, 'host');
    const guest = client(hub, 'guest', 2);
    await host.mp.create('방장');
    hub.now += 10;
    await guest.mp.join(host.mp.code, '손님');
    pass(hub, SETTLE_MS + 100, host, guest);
    expect(guest.mp.lobbyView()?.isHost).toBe(false);
    host.mp.leave();
    pass(hub, 200, guest);
    expect(guest.mp.stage).toBe('lobby');
    expect(guest.mp.lobbyView()?.isHost).toBe(true);
  });
});

describe('판 시작', () => {
  it('손님이 준비하기 전에는 시작할 수 없습니다', async () => {
    const hub = new FakeHub();
    const host = client(hub, 'host');
    const guest = client(hub, 'guest', 2);
    await host.mp.create('방장');
    hub.now += 10;
    await guest.mp.join(host.mp.code, '손님');
    pass(hub, SETTLE_MS + 100, host, guest);
    host.mp.start();
    pass(hub, 100, host, guest);
    expect(host.mp.stage).toBe('lobby');
    guest.mp.start();
    expect(guest.mp.stage).toBe('lobby');
  });

  it('방장이 시작하면 모두 같은 시드로 숫자를 센 뒤 진행합니다', async () => {
    const hub = new FakeHub();
    const host = client(hub, 'host');
    const guest = client(hub, 'guest', 2);
    await host.mp.create('방장');
    hub.now += 10;
    await guest.mp.join(host.mp.code, '손님');
    pass(hub, SETTLE_MS + 100, host, guest);
    guest.mp.toggleReady();
    pass(hub, 100, host, guest);
    expect(host.mp.lobbyView()?.canStart).toBe(true);
    host.mp.start();
    pass(hub, 100, host, guest);
    expect(host.mp.stage).toBe('countdown');
    expect(guest.mp.stage).toBe('countdown');
    expect(guest.mp.seed).toBe(host.mp.seed);
    expect(host.mp.seed).toBeGreaterThan(0);
    expect(host.mp.countdownLeft()).toBe(3);
    pass(hub, COUNTDOWN_MS, host, guest);
    expect(host.mp.stage).toBe('playing');
    expect(guest.mp.stage).toBe('playing');
    expect(host.mp.countdownLeft()).toBe(0);
  });

  it('판이 진행되는 중에 들어온 사람은 대기실에서 기다립니다', async () => {
    const hub = new FakeHub();
    const { host, guest } = await startedPair(hub);
    const late = client(hub, 'late', 3);
    await late.mp.join(host.mp.code, '늦은이');
    pass(hub, SETTLE_MS + 100, host, guest, late);
    late.mp.toggleReady();
    pass(hub, 200, host, guest, late);
    expect(late.mp.stage).toBe('lobby');
    expect(late.mp.lobbyView()?.rows.filter((row) => row.busy)).toHaveLength(2);
    expect(host.mp.rivals().map((rival) => rival.name)).toEqual(['손님']);
  });
});

describe('판 진행과 승패', () => {
  it('상대의 점수와 통이 보입니다', async () => {
    const hub = new FakeHub();
    const { host, guest } = await startedPair(hub);
    guest.mp.report(status({ score: 42, top: 3, fruits: [{ x: 100, y: 400, tier: 3 }] }));
    pass(hub, 400, host, guest);
    const rival = host.mp.rivals()[0];
    expect(rival.name).toBe('손님');
    expect(rival.score).toBe(42);
    expect(rival.top).toBe(3);
    expect(rival.state).toBe('play');
    expect(rival.stale).toBe(false);
    expect(rival.fruits).toHaveLength(1);
    expect(rival.fruits[0].x).toBeCloseTo(100, 0);
  });

  it('수박을 먼저 만든 사람이 이기고 모두 결과 화면으로 갑니다', async () => {
    const hub = new FakeHub();
    const { host, guest } = await startedPair(hub);
    guest.mp.report(status({ score: 900 }));
    host.mp.report(status({ score: 300, top: 10, state: 'win', winTicks: 5000 }));
    pass(hub, 200, host, guest);
    expect(host.mp.stage).toBe('result');
    expect(guest.mp.stage).toBe('result');
    for (const c of [host, guest]) {
      const rows = c.mp.resultRows();
      expect(rows.map((row) => row.name)).toEqual(['방장', '손님']);
      expect(rows[0].winner).toBe(true);
      expect(rows[1].winner).toBe(false);
    }
    expect(host.mp.resultRows()[0].me).toBe(true);
    expect(guest.mp.resultRows()[1].me).toBe(true);
  });

  it('둘이 거의 동시에 수박을 만들면 더 적은 걸음에 만든 사람이 양쪽 화면에서 똑같이 이깁니다', async () => {
    const hub = new FakeHub();
    const { host, guest } = await startedPair(hub);
    host.mp.report(status({ score: 300, top: 10, state: 'win', winTicks: 5000 }));
    guest.mp.report(status({ score: 300, top: 10, state: 'win', winTicks: 4990 }));
    pass(hub, 300, host, guest);
    expect(host.mp.resultRows()[0].name).toBe('손님');
    expect(guest.mp.resultRows()[0].name).toBe('손님');
  });

  it('걸음과 점수가 완전히 같아도 양쪽 화면에서 같은 사람이 이깁니다', async () => {
    const hub = new FakeHub();
    const { host, guest } = await startedPair(hub);
    host.mp.report(status({ score: 300, top: 10, state: 'win', winTicks: 5000 }));
    guest.mp.report(status({ score: 300, top: 10, state: 'win', winTicks: 5000 }));
    pass(hub, 300, host, guest);
    expect(host.mp.resultRows()[0].name).toBe(guest.mp.resultRows()[0].name);
    expect(host.mp.resultRows().filter((row) => row.winner)).toHaveLength(1);
  });

  it('한 명이 탈락해도 남은 사람은 계속하고, 모두 탈락하면 점수로 순위를 매깁니다', async () => {
    const hub = new FakeHub();
    const { host, guest } = await startedPair(hub);
    guest.mp.report(status({ score: 200, state: 'out' }));
    pass(hub, 300, host, guest);
    expect(host.mp.stage).toBe('playing');
    expect(guest.mp.stage).toBe('playing');
    expect(host.mp.rivals()[0].state).toBe('out');
    host.mp.report(status({ score: 150, state: 'out' }));
    pass(hub, 300, host, guest);
    expect(host.mp.stage).toBe('result');
    expect(guest.mp.stage).toBe('result');
    expect(host.mp.resultRows().map((row) => row.name)).toEqual(['손님', '방장']);
    expect(host.mp.resultRows()[0].winner).toBe(true);
  });

  it('판 도중에 나간 사람은 탈락으로 처리하고 나가기 전의 점수로 순위에 넣습니다', async () => {
    const hub = new FakeHub();
    const { host, guest } = await startedPair(hub);
    guest.mp.report(status({ score: 500 }));
    pass(hub, 300, host, guest);
    hub.drop('guest');
    pass(hub, 300, host);
    expect(host.mp.stage).toBe('playing');
    expect(host.mp.rivals()[0].state).toBe('out');
    host.mp.report(status({ score: 100, state: 'out' }));
    pass(hub, 300, host);
    expect(host.mp.stage).toBe('result');
    expect(host.mp.resultRows().map((row) => [row.name, row.score])).toEqual([
      ['손님', 500],
      ['방장', 100],
    ]);
  });

  it('상대의 소식이 끊기면 3초 뒤 불안정으로 표시하고 10초 뒤 탈락으로 봅니다', async () => {
    const hub = new FakeHub();
    const { host, guest } = await startedPair(hub);
    pass(hub, 300, host, guest);
    pass(hub, STALE_MS + 200, host);
    expect(host.mp.rivals()[0].stale).toBe(true);
    expect(host.mp.rivals()[0].state).toBe('play');
    pass(hub, GONE_MS, host);
    expect(host.mp.rivals()[0].state).toBe('out');
    expect(host.mp.stage).toBe('playing');
  });

  it('결과 화면에서 각자 대기실로 돌아가 다음 판을 시작할 수 있습니다', async () => {
    const hub = new FakeHub();
    const { host, guest } = await startedPair(hub);
    host.mp.report(status({ state: 'win', winTicks: 100, top: 10 }));
    pass(hub, 300, host, guest);
    const firstSeed = host.mp.seed;
    host.mp.backToLobby();
    pass(hub, 200, host, guest);
    expect(host.mp.stage).toBe('lobby');
    expect(guest.mp.stage).toBe('result');
    expect(host.mp.lobbyView()?.canStart).toBe(false);
    guest.mp.backToLobby();
    guest.mp.toggleReady();
    pass(hub, 200, host, guest);
    expect(host.mp.lobbyView()?.canStart).toBe(true);
    host.mp.start();
    pass(hub, 200, host, guest);
    expect(host.mp.stage).toBe('countdown');
    expect(guest.mp.stage).toBe('countdown');
    expect(guest.mp.seed).toBe(host.mp.seed);
    expect(host.mp.seed).not.toBe(firstSeed);
    expect(host.mp.rivals()[0].state).toBe('play');
  });

  it('방을 나가면 처음 상태로 돌아가고, 남은 사람에게는 탈락으로 보입니다', async () => {
    const hub = new FakeHub();
    const { host, guest } = await startedPair(hub);
    pass(hub, 300, host, guest);
    guest.mp.leave();
    expect(guest.mp.stage).toBe('idle');
    expect(guest.mp.error).toBeNull();
    expect(guest.stages.at(-1)).toBe('idle');
    pass(hub, 300, host);
    expect(host.mp.rivals()[0].state).toBe('out');
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인합니다**

Run: `npx vitest run tests/multiplayer.test.ts`
Expected: FAIL, `../src/multiplayer`를 찾을 수 없습니다.

- [ ] **Step 3: 구현합니다**

`src/multiplayer.ts`
```ts
import {
  MAX_PLAYERS,
  canStart,
  cleanName,
  judge,
  makeRoomCode,
  parseRoomCode,
  pickHost,
  rank,
  readPlayer,
  roomName,
  seats,
  type Entry,
  type PlayState,
  type Player,
} from './game/match';
import { blendBins, encodeBin, type BinFruit } from './game/snapshot';
import type { LobbyLike, NamedRoomLike } from './net/types';

/** 판이 진행되는 동안 내 상태를 보내는 간격(밀리초). */
export const SEND_INTERVAL = 125;
/** 시작 전에 숫자를 세는 시간. */
export const COUNTDOWN_MS = 3000;
/** 방에 들어온 직후 다른 사람의 상태가 다 도착하기까지 기다리는 시간. 그동안은 방장 권한을 쓰지 않습니다. */
export const SETTLE_MS = 2000;
/** 상대의 소식이 이만큼 끊기면 연결이 불안정하다고 표시합니다. */
export const STALE_MS = 3000;
/** 상대의 소식이 이만큼 끊기면 나간 것으로 봅니다. */
export const GONE_MS = 10000;

export type Stage = 'idle' | 'joining' | 'lobby' | 'countdown' | 'playing' | 'result';

/** 내 판의 상태. 판이 진행되는 동안 매 프레임 알려 줍니다. */
export interface LocalStatus {
  score: number;
  top: number;
  state: PlayState;
  winTicks: number | null;
  fruits: readonly BinFruit[];
}

export interface LobbyRow {
  name: string;
  host: boolean;
  ready: boolean;
  me: boolean;
  /** 아직 판을 하고 있거나 결과를 보고 있는지 여부. */
  busy: boolean;
}

export interface LobbyView {
  code: string;
  invite: string;
  rows: LobbyRow[];
  isHost: boolean;
  ready: boolean;
  canStart: boolean;
  /** 방에 들어온 직후의 기다림이 끝났는지 여부. 끝나기 전에는 버튼을 보여 주지 않습니다. */
  settled: boolean;
}

export interface RivalView {
  peer: string;
  name: string;
  score: number;
  top: number;
  state: PlayState;
  stale: boolean;
  fruits: BinFruit[];
}

export interface ResultRow {
  name: string;
  score: number;
  state: PlayState;
  me: boolean;
  winner: boolean;
}

export interface MultiplayerHooks {
  onStage(stage: Stage): void;
}

/** 같은 판에 참가한 다른 사람에 대해 기억해 두는 것. 방에서 사라져도 순위에 넣기 위해 남겨 둡니다. */
interface Memory {
  player: Player;
  /** 지금 방에 있고 같은 판에 참가 중인지 여부. */
  live: boolean;
  /** 보낸 번호가 마지막으로 바뀐 시각(내 시계). */
  beatAt: number;
  prev: BinFruit[];
  next: BinFruit[];
  binAt: number;
}

const IDLE_STATUS: LocalStatus = { score: 0, top: 0, state: 'play', winTicks: null, fruits: [] };

/** 대기실과 대전의 상태 기계. 방의 presence를 읽고 쓰기만 하며, 화면 요소는 사용하지 않습니다. */
export class Multiplayer {
  stage: Stage = 'idle';
  error: string | null = null;
  code = '';
  seed = 0;
  private room: NamedRoomLike | null = null;
  private name = '';
  private created = false;
  private joinedAt = 0;
  /** 방에 들어온 직후에 한 번만 하는 확인(빈 방, 가득 찬 방)을 마쳤는지 여부. */
  private arrived = false;
  private ready = false;
  private game: string | null = null;
  private games = 0;
  /** 대기실에서 마지막으로 본 방장의 판 이름. 아직 본 적이 없으면 undefined입니다. */
  private hostGameSeen: string | null | undefined = undefined;
  private countdownEnd = 0;
  private lastSent = 0;
  private sentState: PlayState = 'play';
  private beat = 0;
  private status: LocalStatus = IDLE_STATUS;
  private readonly memory = new Map<string, Memory>();
  /** 방이 붙여 준 내 이름표. 점수까지 같을 때 모든 화면이 같은 순서를 고르도록 순위 비교에 씁니다. */
  private myPeer = '';
  /** 방에 들어가는 시도마다 올리는 번호. 기다리는 사이에 나가기를 눌렀는지 알아냅니다. */
  private attempt = 0;

  constructor(
    private readonly lobby: LobbyLike | null,
    private readonly inviteBase: string,
    private readonly hooks: MultiplayerHooks,
    private readonly now: () => number = () => Date.now(),
    private readonly random: () => number = Math.random,
  ) {}

  create(name: string): Promise<void> {
    return this.enter(makeRoomCode(this.random), name, true);
  }

  join(text: string, name: string): Promise<void> {
    const code = parseRoomCode(text);
    if (!code) {
      this.error = '방 코드를 다시 확인해 주세요.';
      return Promise.resolve();
    }
    return this.enter(code, name, false);
  }

  private async enter(code: string, name: string, created: boolean): Promise<void> {
    if (this.stage !== 'idle') return;
    if (!this.lobby) {
      this.error = '이 환경에서는 같이 하기를 사용할 수 없습니다.';
      return;
    }
    const attempt = ++this.attempt;
    this.error = null;
    this.setStage('joining');
    let room: NamedRoomLike;
    try {
      room = await this.lobby.join(roomName(code));
    } catch {
      if (attempt === this.attempt) {
        this.error = '방에 들어가지 못했습니다. 잠시 후 다시 시도해 주세요.';
        this.setStage('idle');
      }
      return;
    }
    if (attempt !== this.attempt) {
      room.leave().catch(() => undefined);
      return;
    }
    this.room = room;
    this.code = code;
    this.name = cleanName(name);
    this.created = created;
    this.joinedAt = this.now();
    this.arrived = false;
    this.ready = false;
    this.game = null;
    this.hostGameSeen = undefined;
    this.memory.clear();
    this.patch({
      name: this.name,
      owner: created,
      since: this.joinedAt,
      phase: 'wait',
      ready: false,
      game: null,
      seed: 0,
      score: 0,
      top: 0,
      st: 'play',
      wt: null,
      b: '',
      n: 0,
    });
    this.setStage('lobby');
  }

  leave(message: string | null = null): void {
    this.attempt++;
    this.room?.leave().catch(() => undefined);
    this.room = null;
    this.memory.clear();
    this.game = null;
    this.ready = false;
    this.error = message;
    this.setStage('idle');
  }

  toggleReady(): void {
    if (this.stage !== 'lobby') return;
    this.ready = !this.ready;
    this.patch({ ready: this.ready });
  }

  /** 방장이 판을 시작합니다. 방장이 아니거나 모두 준비하지 않았으면 아무 일도 하지 않습니다. */
  start(): void {
    if (this.stage !== 'lobby' || !this.settled()) return;
    const { players, mine, host } = this.read();
    if (!mine || !host || host.peer !== mine.peer || !canStart(players, host.peer)) return;
    const game = makeRoomCode(this.random) + (++this.games).toString(36);
    this.begin(game, Math.floor(this.random() * 0x7ffffffe) + 1);
  }

  backToLobby(): void {
    if (this.stage !== 'result') return;
    this.game = null;
    this.ready = false;
    this.hostGameSeen = undefined;
    this.memory.clear();
    this.patch({ phase: 'wait', game: null, ready: false, st: 'play', wt: null, b: '' });
    this.setStage('lobby');
  }

  report(status: LocalStatus): void {
    this.status = status;
  }

  /** 매 프레임 부릅니다. 방의 상태를 읽어서 단계를 옮기고, 내 상태를 보냅니다. */
  update(): void {
    if (!this.room || this.stage === 'idle' || this.stage === 'joining') return;
    const now = this.now();
    const { players, mine, host } = this.read();

    if (this.stage === 'lobby') {
      if (mine && this.settled() && !this.arrived) {
        this.arrived = true;
        if (!this.created && players.length === 1) {
          this.leave('방을 찾을 수 없습니다. 방 코드를 다시 확인해 주세요.');
          return;
        }
        if (seats(players).findIndex((player) => player.peer === mine.peer) >= MAX_PLAYERS) {
          this.leave('방이 가득 찼습니다.');
          return;
        }
      }
      if (mine && host && host.peer !== mine.peer) {
        const game = host.game;
        // 방장의 판 이름이 내가 보고 있는 동안 새 값으로 바뀌었을 때만 막 시작한 판으로 봅니다.
        const fresh = this.hostGameSeen !== undefined && game !== null && game !== this.hostGameSeen;
        this.hostGameSeen = game;
        if (fresh && game !== null && host.phase === 'play' && this.ready && this.settled()) {
          this.begin(game, host.seed);
        }
      }
      return;
    }

    this.remember(players, mine, now);
    if (this.stage === 'countdown') {
      if (now >= this.countdownEnd) this.setStage('playing');
      return;
    }
    if (this.stage === 'playing') {
      if (now - this.lastSent >= SEND_INTERVAL || this.status.state !== this.sentState) this.send(now);
      if (judge(this.entries(now)).over) {
        this.send(now);
        this.setStage('result');
      }
    }
  }

  /** 시작까지 남은 숫자(3, 2, 1). 세는 중이 아니면 0입니다. */
  countdownLeft(): number {
    if (this.stage !== 'countdown') return 0;
    return Math.max(1, Math.ceil((this.countdownEnd - this.now()) / 1000));
  }

  lobbyView(): LobbyView | null {
    if (this.stage !== 'lobby' || !this.room) return null;
    const { players, mine, host } = this.read();
    const isHost = mine !== null && host !== null && host.peer === mine.peer;
    return {
      code: this.code,
      invite: this.inviteBase ? `${this.inviteBase}#${this.code}` : this.code,
      rows: seats(players)
        .slice(0, MAX_PLAYERS)
        .map((player) => ({
          name: player.name,
          host: player.peer === host?.peer,
          ready: player.ready,
          me: player.peer === mine?.peer,
          busy: player.phase === 'play',
        })),
      isHost,
      ready: this.ready,
      canStart: isHost && this.settled() && canStart(players, host?.peer ?? null),
      settled: this.settled(),
    };
  }

  rivals(): RivalView[] {
    if (this.stage !== 'countdown' && this.stage !== 'playing' && this.stage !== 'result') return [];
    const now = this.now();
    return [...this.memory.values()].slice(0, MAX_PLAYERS - 1).map((memory) => ({
      peer: memory.player.peer,
      name: memory.player.name,
      score: memory.player.score,
      top: memory.player.top,
      state: this.stateOf(memory, now),
      stale: this.stage === 'playing' && memory.live && now - this.heard(memory) >= STALE_MS,
      fruits: this.blend(memory, now),
    }));
  }

  resultRows(): ResultRow[] {
    const entries = this.entries(this.now());
    const verdict = judge(entries);
    return rank(entries).map((entry) => ({
      name: entry.name,
      score: entry.score,
      state: entry.state,
      me: entry.me,
      winner: verdict.over && entry.peer === verdict.winner,
    }));
  }

  private settled(): boolean {
    return this.now() - this.joinedAt >= SETTLE_MS;
  }

  private setStage(stage: Stage): void {
    if (this.stage === stage) return;
    this.stage = stage;
    this.hooks.onStage(stage);
  }

  private patch(patch: Record<string, unknown>): void {
    this.room?.presence(patch).catch(() => undefined);
  }

  private read(): { players: Player[]; mine: Player | null; host: Player | null } {
    const players: Player[] = [];
    let mine: Player | null = null;
    for (const peer of this.room?.peers() ?? []) {
      // 게시한 세션이 방에 들어와 있을 수 있는데, 사람이 아니므로 뺍니다.
      if (peer.kind === 'agent') continue;
      const player = readPlayer(peer.peer, peer.presence);
      players.push(player);
      if (peer.sameTab) {
        mine = player;
        this.myPeer = peer.peer;
      }
    }
    const hostPeer = pickHost(players);
    return { players, mine, host: players.find((player) => player.peer === hostPeer) ?? null };
  }

  private begin(game: string, seed: number): void {
    this.game = game;
    this.seed = seed;
    this.ready = false;
    this.status = IDLE_STATUS;
    this.sentState = 'play';
    this.beat = 0;
    this.memory.clear();
    this.countdownEnd = this.now() + COUNTDOWN_MS;
    this.patch({ phase: 'play', game, seed, ready: false, score: 0, top: 0, st: 'play', wt: null, b: '', n: 0 });
    this.setStage('countdown');
  }

  private send(now: number): void {
    this.lastSent = now;
    this.sentState = this.status.state;
    this.patch({
      score: this.status.score,
      top: this.status.top,
      st: this.status.state,
      wt: this.status.winTicks,
      b: encodeBin(this.status.fruits),
      n: ++this.beat,
    });
  }

  /** 같은 판에 참가한 사람의 최신 상태를 기억해 둡니다. */
  private remember(players: readonly Player[], mine: Player | null, now: number): void {
    for (const memory of this.memory.values()) memory.live = false;
    for (const player of players) {
      if (player.peer === mine?.peer || player.phase !== 'play' || player.game !== this.game) continue;
      const memory = this.memory.get(player.peer);
      if (!memory) {
        this.memory.set(player.peer, {
          player,
          live: true,
          beatAt: now,
          prev: player.bin,
          next: player.bin,
          binAt: now,
        });
        continue;
      }
      if (player.beat !== memory.player.beat) {
        memory.prev = this.blend(memory, now);
        memory.next = player.bin;
        memory.binAt = now;
        memory.beatAt = now;
      }
      memory.player = player;
      memory.live = true;
    }
  }

  /** 상대의 소식을 마지막으로 들은 시각. 숫자를 세는 동안에는 아무도 보내지 않으므로 그 시간은 빼고 셉니다. */
  private heard(memory: Memory): number {
    return Math.max(memory.beatAt, this.countdownEnd);
  }

  /** 방에서 사라졌거나 소식이 오래 끊긴 사람은 탈락으로 봅니다. 수박을 만든 기록은 그대로 둡니다. */
  private stateOf(memory: Memory, now: number): PlayState {
    if (memory.player.state !== 'play') return memory.player.state;
    const gone = !memory.live || (this.stage === 'playing' && now - this.heard(memory) >= GONE_MS);
    return gone ? 'out' : 'play';
  }

  private blend(memory: Memory, now: number): BinFruit[] {
    return blendBins(memory.prev, memory.next, (now - memory.binAt) / SEND_INTERVAL);
  }

  private entries(now: number): (Entry & { name: string; me: boolean })[] {
    const list: (Entry & { name: string; me: boolean })[] = [
      {
        peer: this.myPeer,
        name: this.name,
        me: true,
        score: this.status.score,
        state: this.status.state,
        winTicks: this.status.winTicks,
      },
    ];
    for (const memory of this.memory.values()) {
      list.push({
        peer: memory.player.peer,
        name: memory.player.name,
        me: false,
        score: memory.player.score,
        state: this.stateOf(memory, now),
        winTicks: memory.player.winTicks,
      });
    }
    return list;
  }
}
```

- [ ] **Step 4: 테스트가 통과하는지 확인합니다**

Run: `npx vitest run tests/multiplayer.test.ts && npx tsc --noEmit`
Expected: 19개 PASS, 타입 오류 없음.

- [ ] **Step 5: 커밋합니다**

```bash
git add src/multiplayer.ts tests/multiplayer.test.ts
git commit -m "feat: add lobby and match state machine over room presence

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: 같이 하기 화면 연결과 마무리

**Files:**
- Modify: `src/ui/menus.ts` (`lobby`, `multiResult` 화면과 버튼 추가)
- Modify: `src/main.ts` (연결, 상태 기계, 상대의 통 그리기 연결)
- Create: `README.md`

**Interfaces:**
- Consumes: `Multiplayer`, `Stage`, `LobbyView`, `ResultRow`, `RivalView` (Task 10); `connect`, `Connection` (Task 9); `parseRoomCode` (Task 8); `saveName` (Task 6)
- Produces: 완성된 게임. 새로 내보내는 인터페이스는 `MenuView`의 `lobby`, `multiResult` 두 종류와 `MenuActions`의 `ready`, `start`, `copy`, `lobby`, `leave`뿐입니다.

- [ ] **Step 1: 화면에 대기실과 순위표를 더합니다**

`src/ui/menus.ts`에서 다음을 바꿉니다.

파일 맨 위에 import를 더합니다.
```ts
import type { LobbyView, ResultRow } from '../multiplayer';
```

`MenuView`에 두 종류를 더합니다.
```ts
  | { kind: 'play'; muted: boolean; multi: boolean }
  | { kind: 'soloResult'; score: number; best: number; newBest: boolean }
  | { kind: 'lobby'; view: LobbyView; copied: boolean }
  | { kind: 'multiResult'; rows: ResultRow[] };
```

`MenuActions`에 다섯 개를 더합니다.
```ts
export interface MenuActions {
  solo(): void;
  create(name: string): void;
  join(code: string, name: string): void;
  retry(): void;
  home(): void;
  quit(): void;
  sound(): void;
  ready(): void;
  start(): void;
  /** 초대 링크를 복사합니다. */
  copy(invite: string): void;
  /** 결과 화면에서 대기실로 돌아갑니다. */
  lobby(): void;
  leave(): void;
}
```

`soloResult` 함수 아래에 두 함수를 더합니다.
```ts
  function lobby({ view, copied }: Extract<MenuView, { kind: 'lobby' }>): HTMLElement {
    const panel = el('div', 'panel');
    panel.append(el('h1', 'title', '대기실'), el('p', 'code', view.code.toUpperCase()));

    const invite = el('input', 'field');
    invite.readOnly = true;
    invite.value = view.invite;
    invite.addEventListener('focus', () => invite.select());
    panel.append(invite, button(copied ? '복사했습니다' : '초대 링크 복사하기', () => actions.copy(view.invite)));

    const rows = el('ul', 'rows');
    for (const row of view.rows) {
      const item = el('li', row.me ? 'row me' : 'row');
      const tag = row.host ? '방장' : row.busy ? '판 진행 중' : row.ready ? '준비 완료' : '준비 중';
      item.append(el('span', '', row.me ? `${row.name} (나)` : row.name), el('span', 'tag', tag));
      rows.append(item);
    }
    panel.append(rows);

    if (!view.settled) {
      panel.append(el('p', 'hint', '방의 상태를 확인하는 중입니다.'));
    } else if (view.isHost) {
      const start = button('시작하기', actions.start, 'btn primary');
      start.disabled = !view.canStart;
      panel.append(start);
      if (!view.canStart) {
        panel.append(
          el('p', 'hint', view.rows.length < 2 ? '다른 사람이 들어오면 시작할 수 있습니다.' : '모두 준비하면 시작할 수 있습니다.'),
        );
      }
    } else {
      panel.append(button(view.ready ? '준비 취소하기' : '준비하기', actions.ready, 'btn primary'));
      panel.append(el('p', 'hint', '모두 준비하면 방장이 판을 시작합니다. 수박을 먼저 만드는 사람이 이깁니다.'));
    }
    panel.append(button('방 나가기', actions.leave));
    return panel;
  }

  function multiResult(view: Extract<MenuView, { kind: 'multiResult' }>): HTMLElement {
    const panel = el('div', 'panel');
    const mine = view.rows.find((row) => row.me);
    panel.append(el('h1', 'title', mine?.winner ? '승리했습니다' : '판이 끝났습니다'));
    const rows = el('ul', 'rows');
    view.rows.forEach((row, i) => {
      const item = el('li', row.me ? 'row me' : 'row');
      const tag = row.state === 'win' ? `수박 완성 · ${row.score}점` : `${row.score}점`;
      item.append(el('span', '', `${i + 1}위 ${row.me ? `${row.name} (나)` : row.name}`), el('span', 'tag', tag));
      rows.append(item);
    });
    panel.append(rows, button('대기실로 돌아가기', actions.lobby, 'btn primary'), button('방 나가기', actions.leave));
    return panel;
  }
```

`build` 함수를 바꿉니다.
```ts
  function build(view: MenuView): HTMLElement {
    if (view.kind === 'title') return title(view);
    if (view.kind === 'play') return play(view);
    if (view.kind === 'soloResult') return soloResult(view);
    if (view.kind === 'lobby') return lobby(view);
    return multiResult(view);
  }
```

- [ ] **Step 2: 시작점에 같이 하기를 연결합니다**

`src/main.ts`를 다음으로 전체 교체합니다.
```ts
import './style.css';
import { createAudio } from './audio';
import { parseRoomCode } from './game/match';
import { attachInput } from './input';
import { Multiplayer, type Stage } from './multiplayer';
import { connect, type Connection } from './net/connect';
import { Effects } from './render/effects';
import { computeLayout, toBinX } from './render/layout';
import { drawScene } from './render/scene';
import { Session } from './session';
import { browserStorage, loadBest, loadName, saveBest, saveName } from './storage';
import { createMenus, type MenuView } from './ui/menus';

/** 키보드로 위치를 옮기는 속도(통 안의 좌표, 초당). */
const AIM_SPEED = 300;
/** 초대 링크를 복사했다는 표시를 보여 주는 시간(밀리초). */
const COPIED_MS = 2000;

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('#app이 없습니다.');
const canvas = document.createElement('canvas');
app.append(canvas);
const context = canvas.getContext('2d');
if (!context) throw new Error('Canvas 2D를 사용할 수 없습니다.');
const ctx = context;

const store = browserStorage();
const audio = createAudio();
const effects = new Effects();
const input = attachInput(canvas);

/** 개발 중에만 주소에 ?boost=5를 붙여 큰 과일이 나오게 합니다. 배포용 빌드에서는 항상 0입니다. */
const boost = import.meta.env.DEV
  ? Math.max(0, Math.min(5, Number(new URLSearchParams(window.location.search).get('boost')) || 0))
  : 0;
/** 초대 링크로 열었으면 주소 뒤의 방 코드를 입력 칸에 미리 넣어 둡니다. */
const invitedCode = parseRoomCode(window.location.hash) ?? '';

type Mode = 'title' | 'solo' | 'soloOver';
let mode: Mode = 'title';
let session: Session | null = null;
let best = loadBest(store);
let newBest = false;
let width = 0;
let height = 0;
let connection: Connection | null = null;
let mp: Multiplayer | null = null;
let copiedAt = -Infinity;
/** 같이 하기에서 내가 탈락했을 때 소리를 한 번만 내기 위한 표시. */
let outAnnounced = false;

function onStage(stage: Stage): void {
  if (stage === 'countdown' && mp) {
    effects.clear();
    session = new Session(mp.seed, { boost });
    outAnnounced = false;
  } else if (stage === 'result' && mp) {
    if (mp.resultRows().some((row) => row.me && row.winner)) audio.win();
    else if (!outAnnounced) audio.over();
  } else if (stage === 'lobby' || stage === 'idle') {
    session = null;
    effects.clear();
    mode = 'title';
  }
}

void connect().then((result) => {
  connection = result;
  mp = new Multiplayer(result.lobby, result.inviteBase, { onStage });
});

function inRoom(): boolean {
  return mp !== null && mp.stage !== 'idle' && mp.stage !== 'joining';
}

function startSolo(): void {
  if (inRoom()) return;
  audio.unlock();
  effects.clear();
  session = new Session(Math.floor(Math.random() * 0x7fffffff), { boost });
  newBest = false;
  mode = 'solo';
}

function goHome(): void {
  session = null;
  effects.clear();
  mode = 'title';
}

const menus = createMenus(app, {
  solo: startSolo,
  create: (name) => {
    audio.unlock();
    saveName(store, name);
    void mp?.create(name);
  },
  join: (code, name) => {
    audio.unlock();
    saveName(store, name);
    void mp?.join(code, name);
  },
  retry: startSolo,
  home: goHome,
  quit: () => {
    if (inRoom()) mp?.leave();
    else goHome();
  },
  sound: () => audio.toggle(),
  ready: () => mp?.toggleReady(),
  start: () => mp?.start(),
  copy: (invite) => {
    // 클립보드를 쓸 수 없는 환경에서는 입력 칸의 글자를 직접 복사하면 됩니다.
    navigator.clipboard?.writeText(invite).then(
      () => (copiedAt = performance.now()),
      () => undefined,
    );
  },
  lobby: () => mp?.backToLobby(),
  leave: () => mp?.leave(),
});

function view(now: number): MenuView {
  const stage = mp?.stage ?? 'idle';
  if (mp && stage === 'lobby') {
    const lobby = mp.lobbyView();
    if (lobby) return { kind: 'lobby', view: lobby, copied: now - copiedAt < COPIED_MS };
  }
  if (mp && (stage === 'countdown' || stage === 'playing')) return { kind: 'play', muted: audio.muted, multi: true };
  if (mp && stage === 'result') return { kind: 'multiResult', rows: mp.resultRows() };
  if (mode === 'solo') return { kind: 'play', muted: audio.muted, multi: false };
  if (mode === 'soloOver') return { kind: 'soloResult', score: session?.score ?? 0, best, newBest };
  return {
    kind: 'title',
    best,
    name: loadName(store),
    code: invitedCode,
    multi: !connection ? 'connecting' : connection.lobby ? 'ready' : 'none',
    busy: stage === 'joining',
    error: mp?.error ?? null,
  };
}

function resize(): void {
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  if (width !== window.innerWidth || height !== window.innerHeight || canvas.width !== Math.round(width * ratio)) {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
  }
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

let last = performance.now();

function frame(time: number): void {
  const elapsed = Math.max(0, time - last);
  last = time;
  resize();

  const stage = mp?.stage ?? 'idle';
  const multi = inRoom();
  const rivals = mp && multi ? mp.rivals() : [];
  const layout = computeLayout(width, height, rivals.length);
  const running = session !== null && ((mode === 'solo' && !multi) || stage === 'playing');

  // 게임 중이 아닐 때 들어온 입력이 다음 판으로 넘어가지 않게 매 프레임 읽어서 비웁니다.
  const pointer = input.takePointer();
  const wantDrop = input.takeDrop();

  if (session && running) {
    const axis = input.axis();
    if (axis !== 0) session.aim(session.aimX + (axis * AIM_SPEED * Math.min(elapsed, 100)) / 1000);
    if (pointer !== null) session.aim(toBinX(pointer, layout));
    if (wantDrop && session.drop()) audio.drop();
    for (const merge of session.advance(elapsed).merges) {
      effects.merge(merge);
      audio.merge(merge.from);
    }
    if (!multi && session.over) {
      newBest = session.score > best;
      best = saveBest(store, session.score);
      audio.over();
      mode = 'soloOver';
    }
    if (multi && session.over && !outAnnounced) {
      outAnnounced = true;
      audio.over();
    }
  }

  if (mp && session && stage === 'playing') {
    mp.report({
      score: session.score,
      top: session.top,
      state: session.watermelonAt !== null ? 'win' : session.over ? 'out' : 'play',
      winTicks: session.watermelonAt,
      fruits: session.fruits(),
    });
  }
  mp?.update();
  effects.update(Math.min(elapsed, 100) / 1000);

  const held = session?.held ?? null;
  const stageNow = mp?.stage ?? 'idle';
  drawScene(ctx, {
    width,
    height,
    layout,
    fruits: session?.fruits() ?? [],
    held: session && held !== null && stageNow !== 'countdown' && stageNow !== 'result' ? { tier: held, x: session.aimX } : null,
    upcoming: session ? session.upcoming : null,
    score: session?.score ?? 0,
    best,
    overflow: session?.overflowRatio ?? 0,
    effects,
    rivals,
    countdown: mp && stageNow === 'countdown' ? mp.countdownLeft() : null,
    note:
      stageNow === 'playing' && session?.over ? '탈락했습니다. 다른 사람의 통을 구경합니다.' : null,
  });
  menus.show(view(time));
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
```

- [ ] **Step 3: 테스트와 두 가지 빌드를 확인합니다**

Run: `npm test && npm run build && ls dist/assets && npm run build:web && ls dist-web/assets`
Expected:
- 모든 테스트 PASS
- `dist/assets`에는 `.js` 파일 하나와 `.css` 파일 하나만 있습니다. 아티팩트는 파일 하나로 올려야 하므로, `.js` 파일이 둘 이상이면 `connect.ts`의 `import.meta.env.VITE_NET === 'p2p'` 조건이 바뀌지 않았는지 확인합니다.
- `dist-web/assets`에는 peerjs가 들어간 `.js` 파일이 여러 개 있어도 됩니다.

- [ ] **Step 4: 탭 두 개로 같이 하기를 확인합니다**

공개 사이트용 빌드는 P2P로 연결하므로 로컬에서도 탭 두 개로 확인할 수 있습니다. 개발용 큰 과일 기능(`?boost=5`)은 개발 서버에서만 동작하므로, 개발 서버를 P2P 방식으로 띄웁니다.

Run: `npx vite --mode web` (백그라운드로 실행)

탭 A와 탭 B에서 `http://localhost:<포트>/?boost=5`를 엽니다. 숨겨진 탭은 화면 갱신이 멈추므로 두 탭을 각각 다른 창에 나란히 놓고 확인합니다.

확인할 것:
- 처음 화면의 같이 하기에 이름 입력 칸과 방 만들기, 코드로 들어가기가 보입니다.
- 탭 A에서 이름을 넣고 방 만들기를 누르면 대기실에 방 코드와 초대 링크가 보이고, 혼자일 때는 시작하기가 비활성입니다.
- 탭 B에서 방 코드를 넣고 들어가면 양쪽 대기실에 두 사람이 보입니다. 탭 B에는 준비하기가, 탭 A에는 시작하기가 보입니다.
- 탭 B가 준비하면 탭 A의 시작하기가 활성으로 바뀝니다.
- 시작하면 양쪽에서 3, 2, 1을 센 뒤 진행되고, 두 탭에 같은 순서의 과일이 나옵니다.
- 한쪽에서 과일을 놓으면 다른 쪽의 작은 통에 그 과일이 부드럽게 움직이며 보이고, 점수가 따라 올라갑니다.
- 한쪽에서 수박을 만들면 양쪽 모두 결과 화면으로 가고, 수박을 만든 사람이 1위로 표시됩니다.
- 양쪽에서 대기실로 돌아가기를 누른 뒤 다시 준비하고 시작하면 새 판이 진행됩니다.
- 새 판에서 한쪽이 과일을 선 위까지 쌓아 탈락하면 그 탭에는 안내 문구가 보이고, 다른 탭의 작은 통에는 "탈락"이 표시되며 판은 계속됩니다. 남은 쪽도 탈락하면 점수 순서로 순위가 나옵니다.
- 판 도중에 한 탭을 닫으면 남은 탭의 작은 통에 "탈락"이 표시되고 판이 계속됩니다.
- 없는 방 코드(예: `zzzzz`)로 들어가면 약 2초 뒤 방을 찾을 수 없다는 안내와 함께 처음 화면으로 돌아옵니다.
- 초대 링크(`...#방코드`)를 새 탭에서 열면 방 코드 입력 칸에 코드가 들어 있습니다.
- 창을 좁게 줄이면 상대의 통이 내 통 위쪽으로 옮겨지고, 넓히면 옆으로 옮겨집니다.
- 양쪽 탭의 콘솔에 오류가 없습니다.

문제가 있으면 `superpowers:systematic-debugging` 절차로 원인을 먼저 찾고, 상태 기계의 문제라면 `tests/multiplayer.test.ts`에 재현 테스트를 더한 뒤 고칩니다.

- [ ] **Step 5: README를 씁니다**

`README.md`
````markdown
# 수박게임

과일을 통에 떨어뜨려 같은 과일끼리 합치고, 가장 큰 과일인 수박을 만드는 게임입니다. 혼자서 최고 점수에 도전할 수 있고, 방을 만들어 최대 4명이 누가 먼저 수박을 만드는지 겨룰 수 있습니다.

## 실행

```bash
npm install
npm run dev
```

## 규칙

- 과일은 체리, 딸기, 포도, 한라봉, 감, 사과, 배, 복숭아, 파인애플, 멜론, 수박의 11단계입니다. 떨어뜨릴 과일은 체리부터 감까지 가운데에서 나옵니다.
- 같은 과일 둘이 닿으면 다음 단계의 과일 하나로 합쳐지고 점수를 얻습니다. 수박 둘이 닿으면 둘 다 사라집니다.
- 과일이 선 위에 약 2초 동안 머물면 판이 끝납니다.

### 같이 하기

- 한 사람이 방을 만들고 방 코드나 초대 링크를 알려 주면, 다른 사람이 그 코드로 들어옵니다.
- 방장이 아닌 사람이 모두 준비하면 방장이 판을 시작할 수 있습니다. 모두 같은 순서로 과일을 받습니다.
- 수박을 가장 먼저 만든 사람이 이깁니다. 선을 넘은 사람은 탈락하고 남은 사람의 통을 구경합니다.
- 아무도 수박을 만들지 못하고 모두 탈락하면 점수가 높은 순서로 순위를 매깁니다.

## 조작

| 입력 | 동작 |
|---|---|
| 터치·마우스로 끌기 | 위치 잡기 |
| 손가락을 떼기, 마우스 버튼을 놓기 | 과일 떨어뜨리기 |
| ← / → (또는 A / D) | 위치 잡기 |
| Space (또는 ↓) | 과일 떨어뜨리기 |

## 명령

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버를 실행합니다. 이 방식에서는 혼자 하기만 됩니다. |
| `npx vite --mode web` | 같이 하기(P2P)가 되는 개발 서버를 실행합니다. 탭 두 개로 확인할 때 씁니다. |
| `npm test` | 테스트를 실행합니다. |
| `npm run build` | claude.ai 아티팩트용으로 빌드합니다. 같이 하기는 아티팩트의 room 기능을 씁니다. |
| `npm run build:web` | 공개 사이트용으로 `dist-web`에 빌드합니다. 같이 하기는 브라우저끼리 직접 연결(P2P)합니다. |

개발 서버에서는 주소 뒤에 `?boost=5`를 붙이면 큰 과일이 나와서 수박을 빨리 만들어 볼 수 있습니다. 이 기능은 배포용 빌드에서는 동작하지 않습니다.

## 구조

| 위치 | 역할 |
|---|---|
| `src/game/` | 규칙을 담은 순수 함수입니다. 과일 표, 과일 순서, 합치기, 선 넘음 판정, 통 요약, 방 규칙과 승패 계산이 들어 있습니다. |
| `src/physics/world.ts` | matter-js를 감싼 층입니다. 물리 손맛을 정하는 값은 이 파일 위쪽의 상수에 모여 있습니다. |
| `src/session.ts` | 물리와 규칙을 묶어 한 판을 진행합니다. |
| `src/multiplayer.ts` | 대기실과 대전의 상태 기계입니다. |
| `src/net/` | 방에 연결하는 계층입니다. Retro Racer에서 가져왔습니다. |
| `src/render/` | Canvas로 게임 화면을 그립니다. |
| `src/ui/menus.ts` | 처음 화면, 대기실, 결과 화면을 HTML 요소로 만듭니다. |

설계 문서는 `docs/superpowers/specs/2026-10-07-suika-game-design.md`에 있습니다.

## 저장

브라우저의 localStorage에 최고 점수(`suika-game.best.v1`)와 이름(`suika-game.name.v1`)만 저장합니다.

## 아직 하지 않은 것

- claude.ai 아티팩트와 공개 사이트에 올리는 작업은 하지 않았습니다. 아티팩트로 올린 뒤에는 `src/net/connect.ts`의 `CLAUDE_GAME_URL`에 그 주소를 넣어야 초대 링크가 만들어집니다.
- 서로 다른 기기 사이의 같이 하기는 확인하지 않았습니다. 같은 컴퓨터의 탭 두 개로만 확인했습니다.
````

- [ ] **Step 6: 전체를 다시 확인합니다**

Run: `npm test && npm run build && npm run build:web && git status --short`
Expected: 모든 테스트 PASS, 두 빌드 성공. `git status`에는 이 작업에서 바꾼 `src/ui/menus.ts`, `src/main.ts`, `README.md`만 보이고(물리 상수를 조정했다면 `src/physics/world.ts`도), `dist`, `dist-web`, `node_modules`는 보이지 않습니다.

- [ ] **Step 7: 커밋합니다**

```bash
git add src/ui/menus.ts src/main.ts README.md
git commit -m "feat: wire up multiplayer lobby, rival bins and results

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```
