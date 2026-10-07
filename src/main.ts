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
