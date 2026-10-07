import './style.css';
import { createAudio } from './audio';
import { TIMED_SECONDS, parseRoomCode, type Mode, type PlayState } from './game/match';
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

type Screen = 'title' | 'solo' | 'soloOver';
let mode: Screen = 'title';
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
/** 대기실에서 마지막으로 본 사람 수와 준비한 사람 수. 늘어났을 때 소리를 내는 데 씁니다. */
let lobbySeen: { people: number; readied: number } | null = null;

function onStage(stage: Stage): void {
  if (stage === 'countdown' && mp) {
    effects.clear();
    session = new Session(mp.seed, { boost, tickLimit: mp.mode === 'timed' ? TIMED_SECONDS * 60 : undefined });
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

/** 모드에 따라 내 판의 상태를 정합니다. 수박을 만들어서 끝나는 것은 수박 먼저 만들기뿐입니다. */
function playState(current: Session, mode: Mode): PlayState {
  if (mode === 'race' && current.watermelonAt !== null) return 'win';
  if (current.over) return 'out';
  return current.timeUp ? 'done' : 'play';
}

function inRoom(): boolean {
  return mp !== null && mp.stage !== 'idle' && mp.stage !== 'joining';
}

function startSolo(): void {
  // 방에 들어가는 중에 혼자 하기를 시작하면, 들어간 순간 그 판이 사라지므로 막습니다.
  if (inRoom() || mp?.stage === 'joining') return;
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
  mode: (mode) => mp?.setMode(mode),
  leave: () => mp?.leave(),
});

function view(now: number): MenuView {
  const stage = mp?.stage ?? 'idle';
  if (mp && stage === 'lobby') {
    const lobby = mp.lobbyView();
    if (lobby) return { kind: 'lobby', view: lobby, copied: now - copiedAt < COPIED_MS };
  }
  if (mp && (stage === 'countdown' || stage === 'playing')) return { kind: 'play', muted: audio.muted, multi: true };
  if (mp && stage === 'result') return { kind: 'multiResult', rows: mp.resultRows(), mode: mp.mode };
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
    if (mp.mode === 'battle') session.addGarbage(mp.takeGarbage());
    mp.report({
      score: session.score,
      top: session.top,
      state: playState(session, mp.mode),
      winTicks: mp.mode === 'race' ? session.watermelonAt : null,
      fruits: session.fruits(),
      attack: session.attackSent,
    });
  }
  mp?.update();
  // 대기실에 사람이 들어오거나 준비하면 소리로 알립니다.
  const lobbyNow = mp?.lobbyView() ?? null;
  if (lobbyNow) {
    const people = lobbyNow.rows.length;
    const readied = lobbyNow.rows.filter((row) => row.ready).length;
    if (lobbySeen && people > lobbySeen.people) audio.join();
    else if (lobbySeen && readied > lobbySeen.readied) audio.ready();
    lobbySeen = { people, readied };
  } else {
    lobbySeen = null;
  }
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
      stageNow !== 'playing' || !session
        ? null
        : session.over
          ? '탈락했습니다. 다른 사람의 통을 구경합니다.'
          : session.timeUp
            ? '시간이 끝났습니다. 다른 사람을 기다립니다.'
            : null,
    timeLeft: session && stageNow === 'playing' && session.ticksLeft !== null ? session.ticksLeft / 60 : null,
    incoming: session && stageNow === 'playing' ? session.incoming : 0,
  });
  menus.show(view(time));
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
