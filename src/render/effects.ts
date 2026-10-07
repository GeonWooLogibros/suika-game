import { FRUITS } from '../game/fruits';
import type { MergeEvent } from '../session';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface Popup {
  x: number;
  y: number;
  text: string;
  life: number;
}

const PARTICLE_LIFE = 0.5;
const POPUP_LIFE = 0.8;
/** 새로 생긴 과일이 커졌다가 돌아오는 시간(초). */
const POP_TIME = 0.18;

/** 과일이 합쳐질 때의 조각, 떠오르는 점수, 새 과일이 커졌다 돌아오는 효과. 좌표는 통 안의 좌표입니다. */
export class Effects {
  private particles: Particle[] = [];
  private popups: Popup[] = [];
  private readonly pops = new Map<number, number>();

  merge(event: MergeEvent): void {
    const kind = FRUITS[event.from];
    const speed = 60 + kind.radius * 2;
    for (let i = 0; i < 8; i++) {
      // 겉모습에만 쓰는 값이라 시드 난수를 쓰지 않습니다.
      const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.5;
      this.particles.push({
        x: event.x,
        y: event.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: PARTICLE_LIFE,
        color: kind.color,
      });
    }
    this.popups.push({ x: event.x, y: event.y, text: `+${event.score}`, life: POPUP_LIFE });
    if (event.id !== null) this.pops.set(event.id, POP_TIME);
  }

  update(seconds: number): void {
    for (const p of this.particles) {
      p.x += p.vx * seconds;
      p.y += p.vy * seconds;
      p.vy += 300 * seconds;
      p.life -= seconds;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const popup of this.popups) {
      popup.y -= 40 * seconds;
      popup.life -= seconds;
    }
    this.popups = this.popups.filter((popup) => popup.life > 0);
    for (const [id, left] of this.pops) {
      if (left - seconds <= 0) this.pops.delete(id);
      else this.pops.set(id, left - seconds);
    }
  }

  /** 과일을 그릴 때 반지름에 곱할 값. 막 생긴 과일은 조금 크게 그립니다. */
  scaleOf(id: number): number {
    const left = this.pops.get(id);
    return left === undefined ? 1 : 1 + 0.25 * (left / POP_TIME);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / PARTICLE_LIFE);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = "700 20px system-ui, 'Apple SD Gothic Neo', sans-serif";
    for (const popup of this.popups) {
      ctx.globalAlpha = Math.max(0, popup.life / POPUP_LIFE);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#ffffff';
      ctx.strokeText(popup.text, popup.x, popup.y);
      ctx.fillStyle = '#b3541e';
      ctx.fillText(popup.text, popup.x, popup.y);
    }
    ctx.globalAlpha = 1;
  }

  clear(): void {
    this.particles = [];
    this.popups = [];
    this.pops.clear();
  }
}
