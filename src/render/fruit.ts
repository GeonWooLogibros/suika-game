import { FRUITS, STONE } from '../game/fruits';

/** 과일마다 눈과 입의 모양을 다르게 해서 표정이 겹치지 않게 합니다. */
export type Eyes = 'dot' | 'wink' | 'closed' | 'wide' | 'happy' | 'lash' | 'squint' | 'side' | 'cool' | 'line' | 'sparkle' | 'angry';
export type Mouth = 'smile' | 'cat' | 'small' | 'o' | 'beam' | 'grin' | 'tongue' | 'wavy' | 'smirk' | 'flat' | 'open' | 'frown';

export interface Expression {
  eyes: Eyes;
  mouth: Mouth;
  blush: boolean;
}

/** 과일 표와 같은 순서입니다. */
export const EXPRESSIONS: readonly Expression[] = [
  { eyes: 'dot', mouth: 'smile', blush: false }, // 체리: 순한 얼굴
  { eyes: 'wink', mouth: 'cat', blush: true }, // 딸기: 윙크
  { eyes: 'closed', mouth: 'small', blush: false }, // 포도: 졸린 얼굴
  { eyes: 'wide', mouth: 'o', blush: false }, // 한라봉: 놀란 얼굴
  { eyes: 'happy', mouth: 'beam', blush: true }, // 감: 활짝 웃는 얼굴
  { eyes: 'lash', mouth: 'grin', blush: true }, // 사과: 속눈썹과 큰 웃음
  { eyes: 'squint', mouth: 'tongue', blush: false }, // 배: 장난스러운 얼굴
  { eyes: 'side', mouth: 'wavy', blush: true }, // 복숭아: 수줍은 얼굴
  { eyes: 'cool', mouth: 'smirk', blush: false }, // 파인애플: 선글라스
  { eyes: 'line', mouth: 'flat', blush: false }, // 멜론: 무덤덤한 얼굴
  { eyes: 'sparkle', mouth: 'open', blush: true }, // 수박: 신난 얼굴
];

export const STONE_EXPRESSION: Expression = { eyes: 'angry', mouth: 'frown', blush: false };

const INK = '#4a3326';
const LEAF = '#6bb14a';
const LEAF_DARK = '#4c9440';
const STEM = '#8a5a34';

type Ctx = CanvasRenderingContext2D;

/** 과일마다 얼굴을 두는 높이(반지름에 대한 비율)와 크기. 윤곽이 좁아지는 쪽을 피해서 둡니다. */
const FACE: readonly (readonly [number, number])[] = [
  [0.08, 1], // 체리
  [-0.06, 0.9], // 딸기: 넓은 위쪽
  [0.06, 1], // 포도
  [0.12, 0.95], // 한라봉
  [0.1, 1], // 감
  [0.12, 0.95], // 사과
  [0.3, 0.82], // 배: 넓은 아래쪽
  [0.1, 0.95], // 복숭아
  [0.14, 0.8], // 파인애플
  [0.06, 1], // 멜론
  [0.06, 1], // 수박
];

/**
 * 과일의 윤곽을 만듭니다. 물리에서는 모두 원이므로, 원에서 조금만 벗어나게 해서
 * 쌓였을 때 겹치거나 떠 보이지 않게 합니다.
 */
function body(ctx: Ctx, tier: number, r: number): void {
  // 좌우가 같은 윤곽을 오른쪽 절반의 곡선 두 개로 만듭니다. 값은 반지름에 대한 비율입니다.
  const mirrored = (top: number, a: readonly number[], b: readonly number[], bottom: number): void => {
    ctx.moveTo(0, top * r);
    ctx.bezierCurveTo(a[0] * r, a[1] * r, a[2] * r, a[3] * r, a[4] * r, a[5] * r);
    ctx.bezierCurveTo(b[0] * r, b[1] * r, b[2] * r, b[3] * r, 0, bottom * r);
    ctx.bezierCurveTo(-b[2] * r, b[3] * r, -b[0] * r, b[1] * r, -a[4] * r, a[5] * r);
    ctx.bezierCurveTo(-a[2] * r, a[3] * r, -a[0] * r, a[1] * r, 0, top * r);
    ctx.closePath();
  };
  ctx.beginPath();
  switch (tier) {
    case 1: // 딸기: 위가 넓고 아래가 갸름한 모양
      mirrored(-0.9, [0.7, -1.1, 1.18, -0.4, 0.84, 0.2], [0.58, 0.7, 0.22, 1.06], 1.06);
      break;
    case 3: // 한라봉: 위에 볼록한 꼭지
      ctx.arc(0, 0.06 * r, 0.97 * r, 0, Math.PI * 2);
      ctx.moveTo(0.3 * r, -0.9 * r);
      ctx.arc(0, -0.9 * r, 0.3 * r, 0, Math.PI * 2);
      break;
    case 4: // 감: 납작한 모양
      ctx.ellipse(0, 0.05 * r, 1.05 * r, 0.9 * r, 0, 0, Math.PI * 2);
      break;
    case 5: // 사과: 위가 옴폭 들어간 모양
      mirrored(-0.72, [0.3, -1.12, 1.12, -0.95, 1.04, -0.1], [0.98, 0.62, 0.5, 1.1], 0.96);
      break;
    case 6: // 배: 위가 좁고 아래가 넓은 모양
      mirrored(-1.08, [0.42, -1.08, 0.4, -0.5, 0.68, -0.1], [1.18, 0.52, 0.7, 1.06], 1.06);
      break;
    case 7: // 복숭아: 위가 갈라지고 아래가 살짝 뾰족한 모양
      mirrored(-0.76, [0.45, -1.15, 1.2, -0.7, 1.03, 0.05], [0.9, 0.62, 0.35, 0.92], 1.1);
      break;
    case 8: // 파인애플: 세로로 긴 타원
      ctx.ellipse(0, 0.1 * r, 0.84 * r, 0.97 * r, 0, 0, Math.PI * 2);
      break;
    case STONE: {
      // 방해 구슬: 모가 난 돌
      const points = [1, 0.86, 0.98, 0.84, 1, 0.88, 0.96, 0.85];
      points.forEach((scale, i) => {
        const angle = (Math.PI * 2 * i) / points.length;
        const x = Math.cos(angle) * r * scale;
        const y = Math.sin(angle) * r * scale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      break;
    }
    default: // 체리, 포도, 멜론, 수박은 둥근 과일입니다.
      ctx.arc(0, 0, r, 0, Math.PI * 2);
  }
}

function dot(ctx: Ctx, x: number, y: number, radius: number): void {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function leaf(ctx: Ctx, x: number, y: number, length: number, angle: number, color = LEAF): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(length * 0.5, -length * 0.42, length, 0);
  ctx.quadraticCurveTo(length * 0.5, length * 0.42, 0, 0);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function stroke(ctx: Ctx, color: string, width: number): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function stem(ctx: Ctx, fromY: number, toX: number, toY: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(0, fromY * r);
  ctx.quadraticCurveTo(toX * r * 0.2, (fromY + toY) * 0.5 * r, toX * r, toY * r);
  stroke(ctx, STEM, Math.max(1, r * 0.1));
}

/** 윤곽 안쪽에만 무늬를 그립니다. */
function inside(ctx: Ctx, tier: number, r: number, paint: () => void): void {
  ctx.save();
  body(ctx, tier, r);
  ctx.clip();
  paint();
  ctx.restore();
}

/** 몸통 뒤에 그려서 윤곽 밖으로 나오는 부분(꼭지, 잎, 왕관). */
function behind(ctx: Ctx, tier: number, r: number): void {
  if (tier === 0) {
    stem(ctx, -0.8, 0.7, -1.5, r);
    leaf(ctx, r * 0.66, -r * 1.5, r * 0.62, 0.45);
  } else if (tier === 2) {
    stem(ctx, -0.85, 0.12, -1.22, r);
    leaf(ctx, r * 0.1, -r * 1.12, r * 0.5, -0.15);
  } else if (tier === 6) {
    stem(ctx, -0.95, 0.14, -1.36, r);
  } else if (tier === 7) {
    leaf(ctx, r * 0.02, -r * 0.82, r * 0.56, -0.7);
  } else if (tier === 8) {
    // 파인애플: 뾰족한 잎으로 된 왕관
    for (const [angle, length, color] of [
      [-0.7, 0.55, LEAF_DARK],
      [0.7, 0.55, LEAF_DARK],
      [-0.34, 0.72, LEAF],
      [0.34, 0.72, LEAF],
      [0, 0.84, LEAF_DARK],
    ] as const) {
      ctx.save();
      ctx.translate(0, -r * 0.72);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(-r * 0.17, 0);
      ctx.quadraticCurveTo(-r * 0.1, -r * length * 0.6, 0, -r * length);
      ctx.quadraticCurveTo(r * 0.1, -r * length * 0.6, r * 0.17, 0);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
    }
  } else if (tier === 9) {
    stem(ctx, -0.9, 0, -1.2, r);
    ctx.beginPath();
    ctx.moveTo(-r * 0.24, -r * 1.2);
    ctx.lineTo(r * 0.24, -r * 1.2);
    stroke(ctx, STEM, Math.max(1, r * 0.1));
  }
}

/** 몸통 위에 그리는 무늬와 꼭지. 무늬는 옅게 넣어서 얼굴을 가리지 않게 합니다. */
function front(ctx: Ctx, tier: number, r: number): void {
  if (tier === 1) {
    // 딸기: 씨앗 몇 개와 꽃받침
    ctx.fillStyle = 'rgba(255,240,190,0.9)';
    for (const [x, y] of [
      [-0.62, -0.42],
      [0.62, -0.42],
      [-0.5, 0.3],
      [0.5, 0.3],
      [-0.18, 0.72],
      [0.18, 0.72],
    ]) {
      ctx.beginPath();
      ctx.ellipse(x * r, y * r, r * 0.045, r * 0.075, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const angle of [-0.95, -0.45, 0, 0.45, 0.95]) {
      leaf(ctx, 0, -r * 0.94, r * 0.5, Math.PI / 2 + angle, Math.abs(angle) > 0.6 ? LEAF_DARK : LEAF);
    }
  } else if (tier === 3) {
    leaf(ctx, r * 0.04, -r * 1.16, r * 0.46, -0.3);
  } else if (tier === 4) {
    // 감: 네 갈래 꽃받침
    for (let i = 0; i < 4; i++) {
      leaf(ctx, 0, -r * 0.7, r * 0.46, Math.PI / 4 + (i * Math.PI) / 2, i % 2 === 0 ? LEAF : LEAF_DARK);
    }
    ctx.fillStyle = STEM;
    dot(ctx, 0, -r * 0.7, r * 0.08);
  } else if (tier === 5) {
    stem(ctx, -0.7, 0.1, -1.18, r);
    leaf(ctx, r * 0.08, -r * 1.0, r * 0.5, -0.3);
  } else if (tier === 7) {
    // 복숭아: 위에서 내려오는 짧은 골
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.76);
    ctx.quadraticCurveTo(-r * 0.2, -r * 0.5, -r * 0.1, -r * 0.24);
    stroke(ctx, FRUITS[7].accent, Math.max(1, r * 0.05));
  } else if (tier === 8) {
    // 파인애플: 옅은 마름모 무늬
    inside(ctx, tier, r, () => {
      ctx.strokeStyle = 'rgba(190,130,0,0.28)';
      ctx.lineWidth = Math.max(0.6, r * 0.04);
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(i * r * 0.5 - r, -r);
        ctx.lineTo(i * r * 0.5 + r, r * 1.1);
        ctx.moveTo(i * r * 0.5 + r, -r);
        ctx.lineTo(i * r * 0.5 - r, r * 1.1);
        ctx.stroke();
      }
    });
  } else if (tier === 9) {
    // 멜론: 옅은 그물 무늬
    inside(ctx, tier, r, () => {
      ctx.strokeStyle = 'rgba(255,255,240,0.38)';
      ctx.lineWidth = Math.max(0.6, r * 0.03);
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * r * 0.45, -r);
        ctx.quadraticCurveTo(i * r * 0.72, 0, i * r * 0.45, r);
        ctx.moveTo(-r, i * r * 0.45);
        ctx.quadraticCurveTo(0, i * r * 0.72, r, i * r * 0.45);
        ctx.stroke();
      }
    });
  } else if (tier === 10) {
    // 수박: 부드럽게 휜 줄무늬
    inside(ctx, tier, r, () => {
      ctx.strokeStyle = FRUITS[10].accent;
      ctx.lineWidth = r * 0.13;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * r * 0.36, -r);
        ctx.quadraticCurveTo(i * r * 0.74, 0, i * r * 0.36, r);
        ctx.stroke();
      }
    });
    ctx.fillStyle = STEM;
    dot(ctx, 0, -r * 0.94, r * 0.055);
  }
}

function eyes(ctx: Ctx, kind: Eyes, r: number): void {
  const x = r * 0.3;
  const y = 0;
  const size = r * 0.07;
  const line = Math.max(1, r * 0.05);
  ctx.fillStyle = INK;
  const arcEye = (cx: number, up: boolean): void => {
    ctx.beginPath();
    if (up) ctx.arc(cx, y + size, size * 1.5, Math.PI * 1.15, Math.PI * 1.85);
    else ctx.arc(cx, y - size, size * 1.5, Math.PI * 0.15, Math.PI * 0.85);
    stroke(ctx, INK, line);
  };
  const shine = (cx: number, cy: number, radius: number): void => {
    ctx.fillStyle = '#ffffff';
    dot(ctx, cx, cy, radius);
    ctx.fillStyle = INK;
  };
  switch (kind) {
    case 'dot':
      dot(ctx, -x, y, size);
      dot(ctx, x, y, size);
      break;
    case 'wink':
      dot(ctx, -x, y, size * 1.1);
      arcEye(x, true);
      break;
    case 'closed':
      arcEye(-x, false);
      arcEye(x, false);
      break;
    case 'wide':
      // 놀란 눈: 작은 고리
      for (const cx of [-x, x]) {
        ctx.beginPath();
        ctx.arc(cx, y, size * 1.2, 0, Math.PI * 2);
        stroke(ctx, INK, line);
      }
      break;
    case 'happy':
      arcEye(-x, true);
      arcEye(x, true);
      break;
    case 'lash':
      for (const cx of [-x, x]) {
        const out = Math.sign(cx);
        dot(ctx, cx, y, size * 1.1);
        ctx.beginPath();
        ctx.moveTo(cx + out * size * 0.9, y - size * 0.6);
        ctx.lineTo(cx + out * size * 1.9, y - size * 1.4);
        stroke(ctx, INK, line * 0.8);
      }
      break;
    case 'squint':
      for (const cx of [-x, x]) {
        const out = Math.sign(cx);
        ctx.beginPath();
        ctx.moveTo(cx + out * size * 1.2, y - size);
        ctx.lineTo(cx - out * size, y);
        ctx.lineTo(cx + out * size * 1.2, y + size);
        stroke(ctx, INK, line);
      }
      break;
    case 'side':
      // 옆을 흘끗 보는 눈
      for (const cx of [-x, x]) {
        dot(ctx, cx + size * 0.5, y, size * 1.15);
        shine(cx + size * 0.95, y - size * 0.35, size * 0.4);
      }
      break;
    case 'cool':
      for (const cx of [-x, x]) {
        ctx.beginPath();
        ctx.roundRect(cx - size * 2.1, y - size * 1.3, size * 4.2, size * 2.6, size);
        ctx.fillStyle = '#3a3340';
        ctx.fill();
      }
      ctx.beginPath();
      ctx.moveTo(-x + size * 2.1, y - size * 0.5);
      ctx.lineTo(x - size * 2.1, y - size * 0.5);
      stroke(ctx, '#3a3340', line);
      break;
    case 'line':
      for (const cx of [-x, x]) {
        ctx.beginPath();
        ctx.moveTo(cx - size * 1.3, y);
        ctx.lineTo(cx + size * 1.3, y);
        stroke(ctx, INK, line);
      }
      break;
    case 'sparkle':
      for (const cx of [-x, x]) {
        dot(ctx, cx, y, size * 1.45);
        shine(cx - size * 0.45, y - size * 0.5, size * 0.5);
      }
      break;
    case 'angry':
      for (const cx of [-x, x]) {
        const out = Math.sign(cx);
        dot(ctx, cx, y + size * 0.4, size);
        ctx.beginPath();
        ctx.moveTo(cx - out * size * 1.5, y - size * 0.5);
        ctx.lineTo(cx + out * size * 1.5, y - size * 1.8);
        stroke(ctx, INK, line);
      }
      break;
  }
}

function mouth(ctx: Ctx, kind: Mouth, r: number): void {
  const y = r * 0.24;
  const w = r * 0.15;
  const line = Math.max(1, r * 0.05);
  switch (kind) {
    case 'smile':
      ctx.beginPath();
      ctx.arc(0, y - w * 0.5, w, Math.PI * 0.15, Math.PI * 0.85);
      stroke(ctx, INK, line);
      break;
    case 'cat':
      ctx.beginPath();
      ctx.arc(-w * 0.5, y - w * 0.3, w * 0.5, Math.PI * 0.05, Math.PI * 0.95);
      ctx.arc(w * 0.5, y - w * 0.3, w * 0.5, Math.PI * 0.05, Math.PI * 0.95);
      stroke(ctx, INK, line);
      break;
    case 'small':
      ctx.beginPath();
      ctx.arc(0, y - w * 0.2, w * 0.4, Math.PI * 0.1, Math.PI * 0.9);
      stroke(ctx, INK, line);
      break;
    case 'o':
      ctx.beginPath();
      ctx.ellipse(0, y + w * 0.1, w * 0.36, w * 0.48, 0, 0, Math.PI * 2);
      ctx.fillStyle = INK;
      ctx.fill();
      break;
    case 'beam':
      ctx.beginPath();
      ctx.arc(0, y - w * 1.1, w * 1.6, Math.PI * 0.22, Math.PI * 0.78);
      stroke(ctx, INK, line);
      break;
    case 'grin':
      ctx.beginPath();
      ctx.arc(0, y - w * 0.3, w, 0, Math.PI);
      ctx.closePath();
      ctx.fillStyle = INK;
      ctx.fill();
      break;
    case 'tongue':
      ctx.beginPath();
      ctx.arc(0, y - w * 0.5, w, Math.PI * 0.1, Math.PI * 0.9);
      stroke(ctx, INK, line);
      ctx.beginPath();
      ctx.arc(w * 0.3, y + w * 0.38, w * 0.38, 0, Math.PI);
      ctx.closePath();
      ctx.fillStyle = '#ff8fa0';
      ctx.fill();
      break;
    case 'wavy':
      ctx.beginPath();
      ctx.moveTo(-w * 0.8, y);
      ctx.quadraticCurveTo(-w * 0.4, y - w * 0.4, 0, y);
      ctx.quadraticCurveTo(w * 0.4, y + w * 0.4, w * 0.8, y);
      stroke(ctx, INK, line);
      break;
    case 'smirk':
      ctx.beginPath();
      ctx.moveTo(-w * 0.8, y + w * 0.1);
      ctx.quadraticCurveTo(w * 0.2, y + w * 0.5, w, y - w * 0.3);
      stroke(ctx, INK, line);
      break;
    case 'flat':
      ctx.beginPath();
      ctx.moveTo(-w * 0.7, y);
      ctx.lineTo(w * 0.7, y);
      stroke(ctx, INK, line);
      break;
    case 'open':
      ctx.beginPath();
      ctx.arc(0, y - w * 0.3, w * 1.15, 0, Math.PI);
      ctx.closePath();
      ctx.fillStyle = INK;
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, y + w * 0.5, w * 0.55, w * 0.3, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#ff8fa0';
      ctx.fill();
      break;
    case 'frown':
      ctx.beginPath();
      ctx.arc(0, y + w * 0.9, w * 0.8, Math.PI * 1.2, Math.PI * 1.8);
      stroke(ctx, INK, line);
      break;
  }
}

function face(ctx: Ctx, expression: Expression, r: number): void {
  if (expression.blush) {
    ctx.fillStyle = 'rgba(255,120,140,0.3)';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(side * r * 0.5, r * 0.2, r * 0.12, r * 0.075, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  eyes(ctx, expression.eyes, r);
  mouth(ctx, expression.mouth, r);
}

/**
 * 과일 한 개를 그립니다. 물리에서는 모두 원이지만, 그림은 과일마다 윤곽을 다르게 해서
 * 딸기는 갸름하게, 배는 아래가 넓게, 사과와 복숭아는 위가 들어가게 그립니다. 방해 구슬도 여기에서 그립니다.
 */
export function drawFruit(ctx: Ctx, tier: number, x: number, y: number, radius: number, angle = 0): void {
  const stone = tier === STONE;
  const kind = FRUITS[tier];
  if ((!kind && !stone) || radius <= 0) return;
  const color = stone ? '#a3a3ab' : kind.color;
  const accent = stone ? '#74747c' : kind.accent;
  // 아주 작게 그릴 때는 무늬와 얼굴이 뭉개지므로 윤곽과 색만 그립니다.
  const detailed = radius >= 6;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (detailed && !stone) behind(ctx, tier, radius);

  // 테두리를 먼저 굵게 긋고 그 위에 색을 채우면, 겹친 도형의 안쪽 선이 가려져서 바깥 테두리만 남습니다.
  body(ctx, tier, radius);
  stroke(ctx, accent, Math.max(2, radius * 0.14));
  body(ctx, tier, radius);
  ctx.fillStyle = color;
  ctx.fill();

  const [faceY, faceScale] = stone ? [0.05, 1] : FACE[tier];
  ctx.beginPath();
  ctx.ellipse(-radius * 0.4 * faceScale, radius * (faceY - 0.5), radius * 0.16, radius * 0.09, -0.6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.42)';
  ctx.fill();

  if (detailed) {
    if (!stone) front(ctx, tier, radius);
    ctx.translate(0, radius * faceY);
    face(ctx, stone ? STONE_EXPRESSION : EXPRESSIONS[tier], radius * faceScale);
  }
  ctx.restore();
}
