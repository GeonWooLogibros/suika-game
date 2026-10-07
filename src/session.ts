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
