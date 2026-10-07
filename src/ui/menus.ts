import { STONE } from '../game/fruits';
import { MAX_PLAYERS, MODES, type Mode } from '../game/match';
import type { LobbyView, ResultRow } from '../multiplayer';
import { drawFruit } from '../render/fruit';

/** 처음 화면, 대기실, 결과 화면, 게임 중 버튼. 버튼이 눌리면 넘겨받은 함수를 부르기만 하고 게임 상태를 직접 바꾸지 않습니다. */

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
  | { kind: 'soloResult'; score: number; best: number; newBest: boolean }
  | { kind: 'lobby'; view: LobbyView; copied: boolean }
  | { kind: 'multiResult'; rows: ResultRow[]; mode: Mode };

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
  /** 방장이 대기실에서 모드를 고릅니다. */
  mode(mode: Mode): void;
  leave(): void;
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

/** 대기실의 자리마다 앉는 과일. 게임 안의 그림을 그대로 씁니다. */
const SEAT_FRUITS = [5, 3, 7, 9];

function artCanvas(width: number, height: number, className: string): [HTMLCanvasElement, CanvasRenderingContext2D | null] {
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  const canvas = el('canvas', className);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext('2d');
  ctx?.scale(ratio, ratio);
  return [canvas, ctx];
}

function fruitIcon(tier: number, size: number, className = 'avatar'): HTMLCanvasElement {
  const [canvas, ctx] = artCanvas(size, size, className);
  // 꼭지와 잎이 위로 나오므로 과일을 조금 아래에 둡니다.
  if (ctx) drawFruit(ctx, tier, size / 2, size * 0.57, size * 0.35);
  return canvas;
}

/** 모드가 어떤 판인지 과일 그림으로 보여 줍니다. */
function modeArt(mode: Mode): HTMLCanvasElement {
  const [canvas, ctx] = artCanvas(124, 58, 'mode-art');
  if (!ctx) return canvas;
  if (mode === 'race') {
    // 멜론 둘이 수박이 됩니다.
    drawFruit(ctx, 9, 20, 36, 14);
    drawFruit(ctx, 9, 50, 36, 14);
    ctx.strokeStyle = '#c98b4a';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(69, 34);
    ctx.lineTo(79, 34);
    ctx.moveTo(75, 29);
    ctx.lineTo(80, 34);
    ctx.lineTo(75, 39);
    ctx.stroke();
    drawFruit(ctx, 10, 103, 32, 19);
  } else if (mode === 'timed') {
    drawFruit(ctx, 4, 22, 38, 15);
    drawFruit(ctx, 5, 52, 37, 16);
    ctx.beginPath();
    ctx.roundRect(74, 20, 46, 26, 13);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#e8590c';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#e8590c';
    ctx.font = "800 15px system-ui, 'Apple SD Gothic Neo', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('3:00', 97, 34);
  } else if (mode === 'endless') {
    // 통이 가득 찰 때까지 쌓습니다.
    drawFruit(ctx, 5, 26, 43, 13);
    drawFruit(ctx, 7, 55, 42, 14);
    drawFruit(ctx, 3, 84, 44, 12);
    drawFruit(ctx, 4, 108, 45, 11);
    drawFruit(ctx, 2, 41, 22, 10);
    drawFruit(ctx, 6, 70, 21, 11);
    drawFruit(ctx, 1, 97, 25, 9);
  } else {
    // 과일 위로 방해 구슬이 떨어집니다.
    drawFruit(ctx, 7, 38, 39, 17);
    ctx.strokeStyle = 'rgba(116,116,124,0.45)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (const [x, y] of [
      [78, 14],
      [98, 26],
      [84, 42],
    ]) {
      ctx.beginPath();
      ctx.moveTo(x, y - 20);
      ctx.lineTo(x, y - 11);
      ctx.stroke();
      drawFruit(ctx, STONE, x, y, 8);
    }
  }
  return canvas;
}

type Step = 'home' | 'create' | 'join';

export function createMenus(root: HTMLElement, actions: MenuActions): { show(view: MenuView): void } {
  const layer = el('div', 'menus');
  root.append(layer);
  let lastKey = '';
  let lastView: MenuView | null = null;
  // 화면을 다시 만들어도 입력하던 글자가 사라지지 않게 따로 기억합니다.
  let typedName: string | null = null;
  let typedCode: string | null = null;
  /** 처음 화면에서 고른 길. 초대 링크로 열었으면 방 들어가기부터 보여 줍니다. */
  let step: Step | null = null;

  function go(next: Step): void {
    step = next;
    lastKey = '';
    if (lastView) show(lastView);
  }

  /** 그림과 설명이 붙은 큰 선택 버튼. */
  function choice(tier: number, label: string, detail: string, onClick: () => void, primary = false): HTMLButtonElement {
    const node = button('', onClick, primary ? 'choice primary' : 'choice');
    const text = el('span', 'choice-text');
    text.append(el('span', 'choice-label', label), el('span', 'choice-detail', detail));
    node.append(fruitIcon(tier, 44, 'choice-icon'), text);
    return node;
  }

  function field(label: string, input: HTMLInputElement): HTMLLabelElement {
    const wrap = el('label', 'labeled');
    wrap.append(el('span', 'label', label), input);
    return wrap;
  }

  function nameInput(view: Extract<MenuView, { kind: 'title' }>): HTMLInputElement {
    const name = el('input', 'field');
    name.maxLength = 12;
    name.placeholder = '비워 두면 플레이어로 표시됩니다';
    name.value = typedName ?? view.name;
    name.addEventListener('input', () => (typedName = name.value));
    return name;
  }

  function title(view: Extract<MenuView, { kind: 'title' }>): HTMLElement {
    const current: Step = step ?? (view.code ? 'join' : 'home');
    const panel = el('div', 'panel');
    const back = (): HTMLButtonElement => button('뒤로 가기', () => go('home'), 'btn quiet');

    if (current === 'create' && view.multi === 'ready') {
      const name = nameInput(view);
      const create = button('방 만들기', () => actions.create(name.value), 'btn primary');
      create.disabled = view.busy;
      name.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') create.click();
      });
      panel.append(
        el('h1', 'title', '방 만들기'),
        el('p', 'sub', '방을 만들면 방 코드가 나옵니다. 그 코드를 친구에게 알려 줍니다.'),
        field('내 이름', name),
        create,
      );
      if (view.busy) panel.append(el('p', 'hint', '방을 만드는 중입니다.'));
      if (view.error) panel.append(el('p', 'error', view.error));
      panel.append(back());
      return panel;
    }

    if (current === 'join' && view.multi === 'ready') {
      const code = el('input', 'field code-input');
      code.maxLength = 80;
      code.placeholder = '예: AB2CD';
      code.autocapitalize = 'characters';
      code.autocomplete = 'off';
      code.spellcheck = false;
      code.value = typedCode ?? view.code;
      code.addEventListener('input', () => (typedCode = code.value));
      const name = nameInput(view);
      const join = button('방 들어가기', () => actions.join(code.value, name.value), 'btn primary');
      join.disabled = view.busy;
      for (const input of [code, name]) {
        input.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') join.click();
        });
      }
      const invited = view.code !== '' && (typedCode === null || typedCode === view.code);
      panel.append(
        el('h1', 'title', '방 들어가기'),
        el(
          'p',
          'sub',
          invited
            ? '초대받은 방의 코드가 입력되어 있습니다. 이름을 적고 들어갑니다.'
            : '친구에게 받은 방 코드 다섯 글자를 입력합니다. 초대 링크를 붙여 넣어도 됩니다.',
        ),
        field('방 코드', code),
        field('내 이름', name),
        join,
      );
      if (view.busy) panel.append(el('p', 'hint', '방에 들어가는 중입니다.'));
      if (view.error) panel.append(el('p', 'error', view.error));
      panel.append(back());
      return panel;
    }

    panel.append(el('h1', 'title brand', '수박게임'), el('p', 'sub', `최고 점수 ${view.best}`));
    const solo = choice(10, '혼자 하기', '최고 점수에 도전합니다.', actions.solo, true);
    solo.disabled = view.busy;
    const create = choice(5, '방 만들기', '방을 만들고 친구를 초대합니다.', () => go('create'));
    const join = choice(3, '방 들어가기', '받은 방 코드로 친구의 방에 들어갑니다.', () => go('join'));
    create.disabled = join.disabled = view.multi !== 'ready';
    panel.append(solo, create, join);
    if (view.multi === 'connecting') {
      panel.append(el('p', 'hint', '같이 하기에 연결하는 중입니다.'));
    } else if (view.multi === 'none') {
      panel.append(el('p', 'hint', '이 환경에서는 같이 하기를 사용할 수 없습니다. 혼자 하기는 그대로 할 수 있습니다.'));
    }
    if (view.error) panel.append(el('p', 'error', view.error));
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

  function lobby({ view, copied }: Extract<MenuView, { kind: 'lobby' }>): HTMLElement {
    const panel = el('div', 'panel lobby');
    panel.append(el('h1', 'title', '대기실'));

    // 방 코드는 친구에게 불러 줄 수 있게 크게 보여 주고, 바로 옆에서 초대 링크를 복사합니다.
    const ticket = el('div', 'ticket');
    const codeBox = el('div', 'ticket-code');
    codeBox.append(el('span', 'label', '방 코드'), el('strong', 'code', view.code.toUpperCase()));
    ticket.append(codeBox, button(copied ? '복사 완료' : '초대 링크 복사하기', () => actions.copy(view.invite), 'btn small'));
    panel.append(ticket, el('p', 'hint', '친구에게 방 코드를 알려 주거나 초대 링크를 보내면 같은 방에 들어옵니다.'));

    // 자리 네 개를 모두 보여 줘서 몇 명이 더 들어올 수 있는지 알 수 있게 합니다.
    const seats = el('ul', 'seats');
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const row = view.rows[i];
      if (!row) {
        const empty = el('li', 'seat empty');
        empty.append(el('span', 'seat-plus', '+'), el('span', 'seat-name', '빈 자리'));
        seats.append(empty);
        continue;
      }
      const state = row.host ? 'host' : row.busy ? 'busy' : row.ready ? 'ready' : 'waiting';
      const seat = el('li', `seat ${state}${row.me ? ' me' : ''}`);
      const tag = row.host ? '방장' : row.busy ? '판 진행 중' : row.ready ? '준비 완료' : '준비 중';
      seat.append(
        fruitIcon(SEAT_FRUITS[i % SEAT_FRUITS.length], 56),
        el('span', 'seat-name', row.me ? `${row.name} (나)` : row.name),
        el('span', 'seat-tag', tag),
      );
      seats.append(seat);
    }
    panel.append(seats);

    const info = MODES.find((mode) => mode.id === view.mode) ?? MODES[0];
    const canPick = view.isHost && view.settled;
    panel.append(el('h2', 'heading', canPick ? '모드 고르기' : '방장이 고른 모드'));
    const grid = el('div', 'modes');
    for (const mode of MODES) {
      const card = button('', () => actions.mode(mode.id), mode.id === view.mode ? 'mode on' : 'mode');
      card.disabled = !canPick;
      card.append(modeArt(mode.id), el('span', 'mode-label', mode.name));
      grid.append(card);
    }
    panel.append(grid, el('p', 'mode-summary', info.summary));

    const guests = view.rows.filter((row) => !row.host);
    const readyCount = guests.filter((row) => row.ready && !row.busy).length;
    if (!view.settled) {
      panel.append(el('p', 'hint', '방의 상태를 확인하는 중입니다.'));
    } else if (view.isHost) {
      const label = guests.length === 0 ? '시작하기' : `시작하기 (준비 ${readyCount}/${guests.length})`;
      const start = button(label, actions.start, 'btn primary');
      start.disabled = !view.canStart;
      panel.append(start);
      if (!view.canStart) {
        panel.append(
          el('p', 'hint', guests.length === 0 ? '친구가 들어오면 시작할 수 있습니다.' : '모두 준비하면 시작할 수 있습니다.'),
        );
      }
    } else {
      panel.append(button(view.ready ? '준비 취소하기' : '준비하기', actions.ready, view.ready ? 'btn' : 'btn primary'));
      panel.append(
        el('p', 'hint', view.ready ? '방장이 시작하기를 기다립니다.' : '준비하기를 누르면 방장이 판을 시작할 수 있습니다.'),
      );
    }
    panel.append(button('방 나가기', actions.leave, 'btn quiet'));
    return panel;
  }

  function multiResult(view: Extract<MenuView, { kind: 'multiResult' }>): HTMLElement {
    const panel = el('div', 'panel');
    const mine = view.rows.find((row) => row.me);
    panel.append(el('h1', 'title', mine?.winner ? '승리했습니다' : '판이 끝났습니다'));
    panel.append(el('p', 'sub', MODES.find((mode) => mode.id === view.mode)?.name ?? ''));
    const rows = el('ul', 'rows');
    view.rows.forEach((row, i) => {
      const item = el('li', row.me ? 'row me' : 'row');
      const badge = row.state === 'win' ? '수박 완성 · ' : view.mode === 'battle' && row.state === 'play' ? '생존 · ' : '';
      const tag = `${badge}${row.score}점`;
      item.append(el('span', '', `${i + 1}위 ${row.me ? `${row.name} (나)` : row.name}`), el('span', 'tag', tag));
      rows.append(item);
    });
    panel.append(rows, button('대기실로 돌아가기', actions.lobby, 'btn primary'), button('방 나가기', actions.leave, 'btn quiet'));
    return panel;
  }

  function build(view: MenuView): HTMLElement {
    if (view.kind === 'title') return title(view);
    if (view.kind === 'play') return play(view);
    if (view.kind === 'soloResult') return soloResult(view);
    if (view.kind === 'lobby') return lobby(view);
    return multiResult(view);
  }

  function show(view: MenuView): void {
    lastView = view;
    // 방에 들어갔다 나오면 처음 화면의 첫 단계부터 다시 보여 줍니다.
    if (view.kind !== 'title') step = 'home';
    const key = JSON.stringify(view);
    if (key === lastKey) return;
    lastKey = key;
    layer.replaceChildren(build(view));
  }

  return { show };
}
