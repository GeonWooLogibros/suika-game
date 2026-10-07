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

  it('과일을 계속 떨어뜨려 통이 차면 선 넘음 시간이 다 찬 뒤에 판이 끝나고, 그 뒤로는 진행하지 않습니다', () => {
    // 한 줄로 쌓은 과일은 금방 무너지므로, 여러 단계를 번갈아 떨어뜨려 실제 판처럼 통을 채웁니다.
    let index = 0;
    const cycle: FruitQueue = {
      current: () => (index * 3) % 5,
      upcoming: () => ((index + 1) * 3) % 5,
      advance: () => {
        index++;
      },
    };
    const session = new Session(1, { queue: cycle });
    let rising = 0;
    for (let drops = 0; drops < 600 && !session.over; drops++) {
      session.aim(20 + ((drops * 97) % 320));
      session.drop();
      for (let i = 0; i < DROP_COOLDOWN_TICKS && !session.over; i++) {
        session.tick();
        if (!session.over) rising = Math.max(rising, session.overflowRatio);
      }
    }
    expect(session.over).toBe(true);
    expect(session.overflowRatio).toBe(1);
    // 끝나기 직전까지 시간이 차오르는 것이 보였어야 합니다.
    expect(rising).toBeGreaterThan(0.9);
    expect(session.ticks).toBeGreaterThan(OVERFLOW_TICKS);
    const ticks = session.ticks;
    const score = session.score;
    session.tick();
    session.advance(1000);
    expect(session.ticks).toBe(ticks);
    expect(session.score).toBe(score);
    expect(session.drop()).toBe(false);
    expect(session.held).toBeNull();
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
