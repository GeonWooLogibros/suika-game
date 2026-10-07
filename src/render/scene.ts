import { BIN_H, BIN_W, DROP_Y, FRUITS, LINE_Y } from '../game/fruits';
import type { FruitBody } from '../physics/world';
import type { Effects } from './effects';
import { drawFruit } from './fruit';
import type { Layout, Rect } from './layout';

const FONT = "system-ui, 'Apple SD Gothic Neo', sans-serif";
const INK = '#5b3a1e';
/** 화면 오른쪽 위에 겹쳐 놓는 버튼이 차지하는 너비. 점수 표시가 이 자리를 피합니다. */
const BUTTON_ROOM = 150;

export interface RivalDraw {
  name: string;
  score: number;
  top: number;
  state: 'play' | 'out' | 'win';
  /** 한동안 소식이 없어서 연결이 불안정해 보이는지 여부. */
  stale: boolean;
  fruits: readonly { x: number; y: number; tier: number }[];
}

export interface Scene {
  width: number;
  height: number;
  layout: Layout;
  fruits: readonly FruitBody[];
  held: { tier: number; x: number } | null;
  upcoming: number | null;
  score: number;
  best: number;
  /** 선 넘음 시간이 찬 정도(0~1). */
  overflow: number;
  effects: Effects;
  rivals: readonly RivalDraw[];
  /** 시작 전에 세는 숫자. 세지 않을 때는 null입니다. */
  countdown: number | null;
  /** 통 위에 겹쳐서 보여 줄 안내 문구. */
  note: string | null;
}

function box(ctx: CanvasRenderingContext2D, rect: Rect, radius: number): void {
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.w, rect.h, radius);
}

function drawHud(ctx: CanvasRenderingContext2D, scene: Scene): void {
  const { hud } = scene.layout;
  const right = hud.x + Math.max(120, hud.w - BUTTON_ROOM);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.font = `800 26px ${FONT}`;
  ctx.fillText(String(scene.score), hud.x + 4, hud.y + 16, 110);
  ctx.font = `600 13px ${FONT}`;
  ctx.fillStyle = '#9a7650';
  ctx.fillText(`최고 ${scene.best}`, hud.x + 4, hud.y + 42, 110);

  if (scene.upcoming !== null) {
    ctx.textAlign = 'right';
    ctx.fillText('다음', right - 44, hud.y + 16);
    drawFruit(ctx, scene.upcoming, right - 20, hud.y + 16, Math.min(16, FRUITS[scene.upcoming].radius * 0.6));
  }

  // 과일이 커지는 순서를 작은 그림으로 보여 줍니다. 자리가 좁으면 간격을 줄입니다.
  const startX = hud.x + 122;
  const room = right - startX;
  if (room > 60) {
    const gap = Math.min(16, room / FRUITS.length);
    FRUITS.forEach((_, tier) => drawFruit(ctx, tier, startX + gap * (tier + 0.5), hud.y + 42, Math.min(6, gap * 0.42)));
  }
}

function drawBin(ctx: CanvasRenderingContext2D, scene: Scene): void {
  const { bin, scale } = scene.layout;
  box(ctx, bin, 10);
  ctx.fillStyle = '#fff9e8';
  ctx.fill();

  ctx.save();
  box(ctx, bin, 10);
  ctx.clip();
  ctx.translate(bin.x, bin.y);
  ctx.scale(scale, scale);

  ctx.strokeStyle = `rgba(214,48,49,${0.35 + 0.65 * scene.overflow})`;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(0, LINE_Y);
  ctx.lineTo(BIN_W, LINE_Y);
  ctx.stroke();
  ctx.setLineDash([]);

  if (scene.held) {
    ctx.strokeStyle = 'rgba(91,58,30,0.15)';
    ctx.beginPath();
    ctx.moveTo(scene.held.x, DROP_Y);
    ctx.lineTo(scene.held.x, BIN_H);
    ctx.stroke();
    drawFruit(ctx, scene.held.tier, scene.held.x, DROP_Y, FRUITS[scene.held.tier].radius);
  }
  for (const fruit of scene.fruits) {
    drawFruit(ctx, fruit.tier, fruit.x, fruit.y, fruit.radius * scene.effects.scaleOf(fruit.id), fruit.angle);
  }
  scene.effects.draw(ctx);
  ctx.restore();

  box(ctx, bin, 10);
  ctx.strokeStyle = '#c98b4a';
  ctx.lineWidth = 3;
  ctx.stroke();

  const cx = bin.x + bin.w / 2;
  const cy = bin.y + bin.h / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (scene.note) {
    box(ctx, bin, 10);
    ctx.fillStyle = 'rgba(255,244,220,0.7)';
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.font = `700 ${Math.max(13, Math.min(20, bin.w / 16))}px ${FONT}`;
    ctx.fillText(scene.note, cx, cy, bin.w - 24);
  }
  if (scene.countdown !== null) {
    ctx.font = `900 ${Math.round(bin.w / 3)}px ${FONT}`;
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(String(scene.countdown), cx, cy);
    ctx.fillStyle = '#e8590c';
    ctx.fillText(String(scene.countdown), cx, cy);
  }
}

function drawRival(ctx: CanvasRenderingContext2D, rect: Rect, rival: RivalDraw): void {
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.font = `700 12px ${FONT}`;
  ctx.fillText(rival.name, rect.x, rect.y - 11, rect.w * 0.62);
  ctx.textAlign = 'right';
  ctx.fillText(String(rival.score), rect.x + rect.w, rect.y - 11, rect.w * 0.36);

  box(ctx, rect, 6);
  ctx.fillStyle = '#fff9e8';
  ctx.fill();
  ctx.save();
  box(ctx, rect, 6);
  ctx.clip();
  ctx.translate(rect.x, rect.y);
  const scale = rect.w / BIN_W;
  ctx.scale(scale, scale);
  for (const fruit of rival.fruits) {
    const kind = FRUITS[fruit.tier];
    if (kind) drawFruit(ctx, fruit.tier, fruit.x, fruit.y, kind.radius);
  }
  ctx.restore();

  const label = rival.state === 'win' ? '수박 완성' : rival.state === 'out' ? '탈락' : rival.stale ? '연결 불안정' : null;
  if (label) {
    box(ctx, rect, 6);
    ctx.fillStyle = 'rgba(255,244,220,0.75)';
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.font = `700 12px ${FONT}`;
    ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w - 6);
  }
  box(ctx, rect, 6);
  ctx.strokeStyle = rival.state === 'win' ? '#2f9e44' : '#c98b4a';
  ctx.lineWidth = 2;
  ctx.stroke();
}

/** 통, 과일, 점수 표시, 상대의 통을 한 화면으로 그립니다. 상태를 읽기만 하고 바꾸지 않습니다. */
export function drawScene(ctx: CanvasRenderingContext2D, scene: Scene): void {
  ctx.fillStyle = '#fff4dc';
  ctx.fillRect(0, 0, scene.width, scene.height);
  drawHud(ctx, scene);
  drawBin(ctx, scene);
  scene.rivals.forEach((rival, i) => {
    const rect = scene.layout.rivals[i];
    if (rect) drawRival(ctx, rect, rival);
  });
}
