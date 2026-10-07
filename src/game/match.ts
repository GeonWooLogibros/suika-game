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
const MAX_ATTACK = 99_999;

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
  const text = value.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f]/g, '').trim();
  return text ? Array.from(text).slice(0, NAME_LIMIT).join('') : fallback;
}

/** 판 안에서의 상태: 진행 중, 탈락, 수박 완성, 시간 종료. */
export type PlayState = 'play' | 'out' | 'win' | 'done';

/** 방장이 대기실에서 고르는 모드. */
export type Mode = 'race' | 'timed' | 'endless' | 'battle';

/** 시간 제한 점수전의 길이(초). */
export const TIMED_SECONDS = 180;

export const MODES: readonly { id: Mode; name: string; summary: string }[] = [
  { id: 'race', name: '수박 먼저 만들기', summary: '수박을 가장 먼저 만드는 사람이 이깁니다.' },
  { id: 'timed', name: '시간 제한 점수전', summary: '3분 동안 점수를 가장 많이 얻는 사람이 이깁니다.' },
  { id: 'endless', name: '끝까지 점수전', summary: '모두 선을 넘을 때까지 하고, 점수가 가장 높은 사람이 이깁니다.' },
  {
    id: 'battle',
    name: '방해 대전',
    summary: '큰 과일을 만들면 상대의 통에 방해 구슬이 떨어집니다. 마지막까지 남는 사람이 이깁니다.',
  },
];

/** 다른 사람이 보낸 모드 값을 읽습니다. 모르는 값은 기본 모드로 봅니다. */
export function readMode(value: unknown): Mode {
  return MODES.find((mode) => mode.id === value)?.id ?? 'race';
}

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
  /** 방장이 고른 모드. 방장의 값만 씁니다. */
  mode: Mode;
  /** 방해 대전에서 이 사람이 지금까지 보낸 방해 구슬의 수. */
  attack: number;
}

const num = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const whole = (value: unknown, max: number): number => Math.max(0, Math.min(max, Math.floor(num(value))));

/** 다른 사람이 보낸 상태를 믿지 않고, 값마다 형식과 범위를 확인해서 읽습니다. */
export function readPlayer(peer: string, presence: Readonly<Record<string, unknown>>): Player {
  const state: PlayState =
    presence.st === 'win' ? 'win' : presence.st === 'out' ? 'out' : presence.st === 'done' ? 'done' : 'play';
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
    mode: readMode(presence.mode),
    attack: whole(presence.atk, MAX_ATTACK),
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

const byPeer = (a: Entry, b: Entry): number => (a.peer < b.peer ? -1 : a.peer > b.peer ? 1 : 0);

/**
 * 순위. 모드마다 앞에 서는 사람이 다릅니다.
 * 수박 먼저 만들기는 수박을 만든 사람(적은 걸음 순서), 방해 대전은 끝까지 남은 사람이 앞이고,
 * 그 밖에는 점수가 높은 순서입니다. 끝까지 같으면 이름표 순서로 정해서 모든 화면이 같은 결과를 냅니다.
 */
export function rank<T extends Entry>(entries: readonly T[], mode: Mode = 'race'): T[] {
  const lead: PlayState | null = mode === 'race' ? 'win' : mode === 'battle' ? 'play' : null;
  return [...entries].sort((a, b) => {
    const leadA = a.state === lead;
    const leadB = b.state === lead;
    if (leadA !== leadB) return leadA ? -1 : 1;
    if (mode === 'race' && leadA && leadB) {
      const ticksA = a.winTicks ?? Number.MAX_SAFE_INTEGER;
      const ticksB = b.winTicks ?? Number.MAX_SAFE_INTEGER;
      if (ticksA !== ticksB) return ticksA - ticksB;
    }
    if (a.score !== b.score) return b.score - a.score;
    return byPeer(a, b);
  });
}

/**
 * 판이 끝났는지와 이긴 사람.
 * 수박 먼저 만들기는 누군가 수박을 만들었을 때, 방해 대전은 한 사람만 남았을 때 끝나고,
 * 어느 모드든 진행 중인 사람이 없으면 끝납니다.
 */
export function judge(entries: readonly Entry[], mode: Mode = 'race'): { over: boolean; winner: string | null } {
  if (entries.length === 0) return { over: false, winner: null };
  const playing = entries.filter((entry) => entry.state === 'play').length;
  const over =
    playing === 0 ||
    (mode === 'race' && entries.some((entry) => entry.state === 'win')) ||
    (mode === 'battle' && entries.length >= 2 && playing <= 1);
  return over ? { over: true, winner: rank(entries, mode)[0].peer } : { over: false, winner: null };
}
