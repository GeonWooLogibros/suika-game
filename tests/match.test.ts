import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../src/game/random';
import {
  MAX_PLAYERS,
  MODES,
  readMode,
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
    expect(cleanName('  가나\u0000다\u200b  ')).toBe('가나다');
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
      mode: 'race',
      attack: 0,
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

describe('모드', () => {
  it('네 가지 모드가 있고 이름과 설명이 있습니다', () => {
    expect(MODES.map((mode) => mode.id)).toEqual(['race', 'timed', 'endless', 'battle']);
    for (const mode of MODES) {
      expect(mode.name.length).toBeGreaterThan(0);
      expect(mode.summary.endsWith('니다.')).toBe(true);
    }
  });

  it('모르는 값은 수박 먼저 만들기로 읽습니다', () => {
    expect(readMode('battle')).toBe('battle');
    expect(readMode('timed')).toBe('timed');
    expect(readMode('hack')).toBe('race');
    expect(readMode(undefined)).toBe('race');
  });

  it('보낸 값에서 모드, 보낸 방해 구슬의 수, 시간 종료 상태를 읽습니다', () => {
    const player = readPlayer('p', { mode: 'battle', atk: 12, st: 'done' });
    expect(player.mode).toBe('battle');
    expect(player.attack).toBe(12);
    expect(player.state).toBe('done');
    expect(readPlayer('p', { atk: -4 }).attack).toBe(0);
    expect(readPlayer('p', { atk: 'many' }).attack).toBe(0);
  });

  const entry = (peer: string, state: Entry['state'], score: number, winTicks: number | null = null): Entry => ({
    peer,
    state,
    score,
    winTicks,
  });

  it('점수전은 수박을 만들어도 끝나지 않고, 모두 끝나면 점수가 높은 사람이 이깁니다', () => {
    for (const mode of ['timed', 'endless'] as const) {
      expect(judge([entry('a', 'play', 900), entry('b', 'out', 100)], mode).over).toBe(false);
      expect(judge([entry('a', 'play', 10), entry('b', 'done', 500)], mode).over).toBe(false);
      const done = [entry('a', 'out', 300), entry('b', 'done', 250), entry('c', 'done', 700)];
      expect(judge(done, mode)).toEqual({ over: true, winner: 'c' });
      expect(rank(done, mode).map((e) => e.peer)).toEqual(['c', 'a', 'b']);
    }
  });

  it('방해 대전은 한 사람만 남으면 끝나고, 남은 사람이 점수와 상관없이 이깁니다', () => {
    const playing = [entry('a', 'play', 10), entry('b', 'play', 900), entry('c', 'out', 500)];
    expect(judge(playing, 'battle').over).toBe(false);
    const last = [entry('a', 'play', 10), entry('b', 'out', 900), entry('c', 'out', 500)];
    expect(judge(last, 'battle')).toEqual({ over: true, winner: 'a' });
    expect(rank(last, 'battle').map((e) => e.peer)).toEqual(['a', 'b', 'c']);
  });

  it('방해 대전에서 동시에 모두 탈락하면 점수가 높은 사람이 이깁니다', () => {
    expect(judge([entry('a', 'out', 10), entry('b', 'out', 900)], 'battle')).toEqual({ over: true, winner: 'b' });
  });

  it('모드를 주지 않으면 수박 먼저 만들기 규칙을 씁니다', () => {
    expect(judge([entry('a', 'play', 900), entry('b', 'win', 300, 4000)])).toEqual({ over: true, winner: 'b' });
  });
});
