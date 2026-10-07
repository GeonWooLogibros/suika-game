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
