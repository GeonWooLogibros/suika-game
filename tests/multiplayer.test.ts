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

describe('검토에서 찾은 문제', () => {
  it('방장이 바뀌어도, 새 방장이 보고 있는 이미 끝난 판에 대기실 사람이 끌려 들어가지 않습니다', async () => {
    const hub = new FakeHub();
    const a = client(hub, 'a', 1);
    const b = client(hub, 'b', 2);
    const c = client(hub, 'c', 3);
    await a.mp.create('가');
    hub.now += 10;
    await b.mp.join(a.mp.code, '나');
    hub.now += 10;
    await c.mp.join(a.mp.code, '다');
    pass(hub, SETTLE_MS + 100, a, b, c);
    b.mp.toggleReady();
    c.mp.toggleReady();
    pass(hub, 100, a, b, c);
    a.mp.start();
    pass(hub, COUNTDOWN_MS + 200, a, b, c);
    a.mp.report(status({ state: 'win', winTicks: 100, top: 10 }));
    pass(hub, 300, a, b, c);
    expect(b.mp.stage).toBe('result');
    // 가와 다는 대기실로 돌아가고, 나는 결과 화면에 남아 있습니다.
    a.mp.backToLobby();
    c.mp.backToLobby();
    c.mp.toggleReady();
    pass(hub, 300, a, b, c);
    a.mp.leave();
    pass(hub, 600, b, c);
    expect(c.mp.stage).toBe('lobby');
  });

  it('소식이 끊겨 탈락으로 본 상대는 결과 화면에서도 탈락으로 남고, 남은 사람이 승자로 표시됩니다', async () => {
    const hub = new FakeHub();
    const { host, guest } = await startedPair(hub);
    guest.mp.report(status({ score: 500 }));
    host.mp.report(status({ score: 600 }));
    pass(hub, 300, host, guest);
    pass(hub, GONE_MS + 500, host);
    expect(host.mp.rivals()[0].state).toBe('out');
    host.mp.report(status({ score: 600, state: 'out' }));
    pass(hub, 300, host);
    expect(host.mp.stage).toBe('result');
    pass(hub, 1000, host);
    expect(host.mp.rivals()[0].state).toBe('out');
    const rows = host.mp.resultRows();
    expect(rows.map((row) => row.name)).toEqual(['방장', '손님']);
    expect(rows[0].winner).toBe(true);
    expect(rows[0].me).toBe(true);
  });
});
