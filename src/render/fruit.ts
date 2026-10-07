import { FRUITS, WATERMELON } from '../game/fruits';

/** 과일 한 개를 그립니다. 색이 다른 원에 꼭지와 간단한 얼굴을 붙이고, 수박에는 줄무늬를 넣습니다. */
export function drawFruit(
  ctx: CanvasRenderingContext2D,
  tier: number,
  x: number,
  y: number,
  radius: number,
  angle = 0,
): void {
  const kind = FRUITS[tier];
  if (!kind || radius <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = kind.color;
  ctx.fill();

  if (tier === WATERMELON) {
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = kind.accent;
    ctx.lineWidth = radius * 0.14;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * radius * 0.4, -radius);
      ctx.quadraticCurveTo(i * radius * 0.75, 0, i * radius * 0.4, radius);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.strokeStyle = kind.accent;
  ctx.lineWidth = Math.max(1, radius * 0.08);
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(-radius * 0.38, -radius * 0.42, radius * 0.2, radius * 0.12, -0.6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(0, -radius * 0.94, radius * 0.16, radius * 0.08, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#5a8f3c';
  ctx.fill();

  // 아주 작게 그릴 때는 얼굴이 뭉개지므로 생략합니다.
  if (radius >= 7) {
    ctx.fillStyle = '#3b2a20';
    ctx.beginPath();
    ctx.arc(-radius * 0.28, -radius * 0.02, radius * 0.07, 0, Math.PI * 2);
    ctx.arc(radius * 0.28, -radius * 0.02, radius * 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, radius * 0.1, radius * 0.16, Math.PI * 0.15, Math.PI * 0.85);
    ctx.strokeStyle = '#3b2a20';
    ctx.lineWidth = Math.max(1, radius * 0.05);
    ctx.lineCap = 'round';
    ctx.stroke();
  }
  ctx.restore();
}
