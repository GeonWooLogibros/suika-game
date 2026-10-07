import { describe, expect, it } from 'vitest';
import { BIN_H, BIN_W, FRUITS } from '../src/game/fruits';
import { World } from '../src/physics/world';

describe('물리 세계', () => {
  it('과일을 추가하고 지울 수 있습니다', () => {
    const world = new World();
    const id = world.add(2, 100, 50);
    expect(world.tierOf(id)).toBe(2);
    expect(world.get(id)?.radius).toBe(FRUITS[2].radius);
    world.remove(id);
    expect(world.get(id)).toBeUndefined();
    expect(world.fruits()).toHaveLength(0);
  });

  it('과일은 아래로 떨어져 바닥에서 멈춥니다', () => {
    const world = new World();
    const id = world.add(0, 180, 50);
    for (let i = 0; i < 300; i++) world.step();
    const fruit = world.get(id);
    expect(fruit?.y).toBeGreaterThan(BIN_H - FRUITS[0].radius - 3);
    expect(fruit?.y).toBeLessThan(BIN_H - FRUITS[0].radius + 3);
  });

  it('떨어지는 동안에는 자리를 잡지 않은 상태이고, 닿으면 자리를 잡습니다', () => {
    const world = new World();
    const id = world.add(0, 180, 50);
    world.step();
    expect(world.get(id)?.settled).toBe(false);
    for (let i = 0; i < 300; i++) world.step();
    expect(world.get(id)?.settled).toBe(true);
  });

  it('위아래로 놓인 두 과일이 닿으면 그 쌍을 알려 줍니다', () => {
    const world = new World();
    const a = world.add(0, 180, 300);
    const b = world.add(0, 180, 200);
    let met = false;
    for (let i = 0; i < 300 && !met; i++) {
      world.step();
      met = world.contacts().some(([p, q]) => (p === a && q === b) || (p === b && q === a));
    }
    expect(met).toBe(true);
  });

  it('과일을 많이 넣어도 통 밖으로 나가지 않습니다', () => {
    const world = new World();
    for (let i = 0; i < 40; i++) {
      const tier = i % 5;
      world.add(tier, 30 + ((i * 53) % 300), 40);
      for (let s = 0; s < 20; s++) world.step();
    }
    for (let s = 0; s < 600; s++) world.step();
    for (const fruit of world.fruits()) {
      expect(fruit.x).toBeGreaterThan(fruit.radius - 3);
      expect(fruit.x).toBeLessThan(BIN_W - fruit.radius + 3);
      expect(fruit.y).toBeLessThan(BIN_H - fruit.radius + 3);
    }
  });
});
