import type { LobbyView, ResultRow } from '../multiplayer';

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
  | { kind: 'multiResult'; rows: ResultRow[] };

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

  function build(view: MenuView): HTMLElement {
    if (view.kind === 'title') return title(view);
    if (view.kind === 'play') return play(view);
    if (view.kind === 'soloResult') return soloResult(view);
    if (view.kind === 'lobby') return lobby(view);
    return multiResult(view);
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
