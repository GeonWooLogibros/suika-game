import Matter from 'matter-js';
import { BIN_H, BIN_W, FRUITS } from '../game/fruits';
import { STEP_MS } from '../game/rules';

const { Bodies, Composite, Engine, Events } = Matter;

/** 손맛을 정하는 값. 실제로 해 보면서 여기에서 조정합니다. */
const GRAVITY = 1.4;
const RESTITUTION = 0.15;
const FRICTION = 0.4;
const AIR_FRICTION = 0.008;
/** 빠르게 떨어지는 과일이 뚫고 나가지 않도록 벽을 두껍게 둡니다. */
const WALL = 60;

export interface FruitBody {
  id: number;
  tier: number;
  x: number;
  y: number;
  angle: number;
  radius: number;
  /** 놓인 뒤 벽이나 다른 과일에 한 번이라도 닿았는지 여부. */
  settled: boolean;
}

interface Item {
  body: Matter.Body;
  tier: number;
  settled: boolean;
}

/** matter-js를 감싼 층. 바깥에는 과일의 위치와 맞닿은 쌍만 내보냅니다. */
export class World {
  private readonly engine = Engine.create({ positionIterations: 10, velocityIterations: 8 });
  private readonly items = new Map<number, Item>();
  /** matter-js가 붙인 몸체 번호에서 과일 번호를 찾습니다. */
  private readonly idOf = new Map<number, number>();
  private touching: [number, number][] = [];
  private nextId = 1;

  constructor() {
    this.engine.gravity.y = GRAVITY;
    const tall = BIN_H * 3;
    Composite.add(this.engine.world, [
      Bodies.rectangle(BIN_W / 2, BIN_H + WALL / 2, BIN_W + WALL * 2, WALL, { isStatic: true }),
      Bodies.rectangle(-WALL / 2, BIN_H - tall / 2, WALL, tall, { isStatic: true }),
      Bodies.rectangle(BIN_W + WALL / 2, BIN_H - tall / 2, WALL, tall, { isStatic: true }),
    ]);
    const collect = (event: Matter.IEventCollision<Matter.Engine>): void => {
      for (const pair of event.pairs) {
        const a = this.idOf.get(pair.bodyA.id);
        const b = this.idOf.get(pair.bodyB.id);
        const itemA = a === undefined ? undefined : this.items.get(a);
        const itemB = b === undefined ? undefined : this.items.get(b);
        if (itemA) itemA.settled = true;
        if (itemB) itemB.settled = true;
        if (a !== undefined && b !== undefined) this.touching.push([a, b]);
      }
    };
    Events.on(this.engine, 'collisionStart', collect);
    Events.on(this.engine, 'collisionActive', collect);
  }

  add(tier: number, x: number, y: number, settled = false): number {
    const body = Bodies.circle(x, y, FRUITS[tier].radius, {
      restitution: RESTITUTION,
      friction: FRICTION,
      frictionAir: AIR_FRICTION,
    });
    Composite.add(this.engine.world, body);
    const id = this.nextId++;
    this.items.set(id, { body, tier, settled });
    this.idOf.set(body.id, id);
    return id;
  }

  remove(id: number): void {
    const item = this.items.get(id);
    if (!item) return;
    Composite.remove(this.engine.world, item.body);
    this.items.delete(id);
    this.idOf.delete(item.body.id);
  }

  step(): void {
    this.touching = [];
    Engine.update(this.engine, STEP_MS);
  }

  tierOf(id: number): number | undefined {
    return this.items.get(id)?.tier;
  }

  get(id: number): FruitBody | undefined {
    const item = this.items.get(id);
    return item ? this.view(id, item) : undefined;
  }

  fruits(): FruitBody[] {
    const list: FruitBody[] = [];
    for (const [id, item] of this.items) list.push(this.view(id, item));
    return list;
  }

  /** 마지막 step에서 맞닿아 있던 과일 쌍. */
  contacts(): readonly (readonly [number, number])[] {
    return this.touching;
  }

  private view(id: number, item: Item): FruitBody {
    return {
      id,
      tier: item.tier,
      x: item.body.position.x,
      y: item.body.position.y,
      angle: item.body.angle,
      radius: FRUITS[item.tier].radius,
      settled: item.settled,
    };
  }
}
