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

const INK = '#3b2a20';
const LEAF = '#4f9a3d';
const LEAF_DARK = '#2f6b2a';
const STEM = '#7a5230';

type Ctx = CanvasRenderingContext2D;

function disc(ctx: Ctx, r: number): void {
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
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
  ctx.quadraticCurveTo(length * 0.5, -length * 0.45, length, 0);
  ctx.quadraticCurveTo(length * 0.5, length * 0.45, 0, 0);
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

/** 원 안쪽에만 무늬를 그립니다. */
function inside(ctx: Ctx, r: number, paint: () => void): void {
  ctx.save();
  disc(ctx, r);
  ctx.clip();
  paint();
  ctx.restore();
}

/** 몸통 뒤에 그려서 원 밖으로 살짝 나오는 부분(꼭지, 잎, 왕관). */
function behind(ctx: Ctx, tier: number, r: number): void {
  if (tier === 0) {
    // 체리: 길게 휜 꼭지와 잎
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.8);
    ctx.quadraticCurveTo(r * 0.1, -r * 1.5, r * 0.75, -r * 1.55);
    stroke(ctx, STEM, Math.max(1, r * 0.13));
    leaf(ctx, r * 0.7, -r * 1.55, r * 0.7, 0.5);
  } else if (tier === 3) {
    // 한라봉: 위로 볼록 솟은 꼭지
    ctx.beginPath();
    ctx.arc(0, -r * 0.88, r * 0.34, 0, Math.PI * 2);
    ctx.fillStyle = FRUITS[3].color;
    ctx.fill();
    stroke(ctx, FRUITS[3].accent, Math.max(1, r * 0.08));
  } else if (tier === 8) {
    // 파인애플: 뾰족한 잎으로 된 왕관
    for (const [angle, length, color] of [
      [-0.75, 0.62, LEAF_DARK],
      [0.75, 0.62, LEAF_DARK],
      [-0.38, 0.8, LEAF],
      [0.38, 0.8, LEAF],
      [0, 0.92, LEAF_DARK],
    ] as const) {
      ctx.save();
      ctx.translate(0, -r * 0.8);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(-r * 0.16, 0);
      ctx.quadraticCurveTo(-r * 0.1, -r * length * 0.6, 0, -r * length);
      ctx.quadraticCurveTo(r * 0.1, -r * length * 0.6, r * 0.16, 0);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
    }
  } else if (tier === 5 || tier === 6 || tier === 7 || tier === 9) {
    // 사과, 배, 복숭아, 멜론: 짧은 꼭지
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.82);
    ctx.quadraticCurveTo(r * 0.05, -r * 1.05, r * (tier === 6 ? 0.18 : 0.08), -r * 1.2);
    stroke(ctx, STEM, Math.max(1, r * 0.09));
    if (tier === 9) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.2, -r * 1.2);
      ctx.lineTo(r * 0.36, -r * 1.2);
      stroke(ctx, STEM, Math.max(1, r * 0.09));
    } else if (tier !== 6) {
      leaf(ctx, r * 0.06, -r * 1.05, r * 0.5, tier === 7 ? -0.5 : -0.25);
    }
  }
}

/** 몸통 위에 그리는 무늬. */
function pattern(ctx: Ctx, tier: number, r: number): void {
  const accent = tier === STONE ? '#6c6c72' : FRUITS[tier].accent;
  if (tier === 1) {
    // 딸기: 씨앗과 초록 꽃받침
    ctx.fillStyle = '#ffe9a3';
    for (const [x, y] of [
      [-0.62, -0.25],
      [0.62, -0.25],
      [-0.72, 0.2],
      [0.72, 0.2],
      [-0.45, 0.62],
      [0.45, 0.62],
      [0, 0.8],
      [-0.2, -0.5],
      [0.2, -0.5],
    ]) {
      ctx.beginPath();
      ctx.ellipse(x * r, y * r, r * 0.05, r * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = -2; i <= 2; i++) leaf(ctx, 0, -r * 0.98, r * 0.55, Math.PI / 2 + i * 0.55, i % 2 === 0 ? LEAF : LEAF_DARK);
  } else if (tier === 2) {
    // 포도: 알이 모여 있는 송이
    inside(ctx, r, () => {
      ctx.fillStyle = 'rgba(255,255,255,0.13)';
      ctx.strokeStyle = accent;
      ctx.lineWidth = Math.max(0.6, r * 0.05);
      for (const [x, y] of [
        [-0.5, -0.55],
        [0.5, -0.55],
        [0, -0.62],
        [-0.72, 0.05],
        [0.72, 0.05],
        [-0.45, 0.62],
        [0.45, 0.62],
        [0, 0.78],
      ]) {
        ctx.beginPath();
        ctx.arc(x * r, y * r, r * 0.36, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    });
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.9);
    ctx.lineTo(r * 0.12, -r * 1.2);
    stroke(ctx, STEM, Math.max(1, r * 0.11));
  } else if (tier === 3) {
    // 한라봉: 오돌토돌한 껍질과 잎
    ctx.fillStyle = 'rgba(190,105,0,0.35)';
    for (const [x, y] of [
      [-0.6, -0.4],
      [0.55, -0.45],
      [-0.75, 0.15],
      [0.78, 0.1],
      [-0.4, 0.7],
      [0.4, 0.72],
      [0, -0.6],
    ]) {
      dot(ctx, x * r, y * r, r * 0.04);
    }
    leaf(ctx, r * 0.05, -r * 1.18, r * 0.5, -0.2);
  } else if (tier === 4) {
    // 감: 네 갈래 꽃받침
    for (let i = 0; i < 4; i++) leaf(ctx, 0, -r * 0.72, r * 0.52, Math.PI / 4 + (i * Math.PI) / 2, i % 2 === 0 ? LEAF : LEAF_DARK);
    ctx.fillStyle = STEM;
    dot(ctx, 0, -r * 0.72, r * 0.09);
  } else if (tier === 5) {
    // 사과: 꼭지가 들어간 자리
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.82, r * 0.28, r * 0.1, 0, 0, Math.PI * 2);
    ctx.fillStyle = accent;
    ctx.fill();
  } else if (tier === 6) {
    // 배: 껍질의 작은 점
    ctx.fillStyle = 'rgba(150,120,40,0.45)';
    for (const [x, y] of [
      [-0.55, -0.5],
      [0.3, -0.62],
      [0.68, -0.2],
      [-0.75, 0.05],
      [0.72, 0.35],
      [-0.5, 0.62],
      [0.15, 0.82],
      [0.5, 0.68],
      [-0.2, -0.72],
    ]) {
      dot(ctx, x * r, y * r, r * 0.035);
    }
  } else if (tier === 7) {
    // 복숭아: 가운데 골과 아래쪽의 붉은 기운
    inside(ctx, r, () => {
      const glow = ctx.createRadialGradient(0, r * 0.7, 0, 0, r * 0.7, r * 1.1);
      glow.addColorStop(0, 'rgba(255,120,140,0.55)');
      glow.addColorStop(1, 'rgba(255,120,140,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(-r, -r, r * 2, r * 2);
    });
    ctx.beginPath();
    ctx.moveTo(r * 0.04, -r * 0.95);
    ctx.quadraticCurveTo(-r * 0.3, -r * 0.5, -r * 0.12, -r * 0.2);
    stroke(ctx, accent, Math.max(1, r * 0.06));
  } else if (tier === 8) {
    // 파인애플: 마름모 무늬
    inside(ctx, r, () => {
      ctx.strokeStyle = 'rgba(180,120,0,0.55)';
      ctx.lineWidth = Math.max(0.6, r * 0.045);
      for (let i = -4; i <= 4; i++) {
        ctx.beginPath();
        ctx.moveTo(i * r * 0.42 - r, -r);
        ctx.lineTo(i * r * 0.42 + r, r);
        ctx.moveTo(i * r * 0.42 + r, -r);
        ctx.lineTo(i * r * 0.42 - r, r);
        ctx.stroke();
      }
    });
  } else if (tier === 9) {
    // 멜론: 그물 무늬
    inside(ctx, r, () => {
      ctx.strokeStyle = 'rgba(255,255,235,0.6)';
      ctx.lineWidth = Math.max(0.6, r * 0.035);
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(i * r * 0.36, -r);
        ctx.quadraticCurveTo(i * r * 0.62, 0, i * r * 0.36, r);
        ctx.moveTo(-r, i * r * 0.36);
        ctx.quadraticCurveTo(0, i * r * 0.62, r, i * r * 0.36);
        ctx.stroke();
      }
    });
  } else if (tier === 10) {
    // 수박: 구불구불한 줄무늬
    inside(ctx, r, () => {
      ctx.strokeStyle = accent;
      ctx.lineWidth = r * 0.15;
      ctx.lineJoin = 'round';
      for (let i = -2; i <= 2; i++) {
        const x = i * r * 0.44;
        ctx.beginPath();
        ctx.moveTo(x, -r);
        for (let step = 1; step <= 8; step++) {
          const y = -r + (step * r) / 4;
          const bulge = Math.cos((y / r) * (Math.PI / 2)) * i * r * 0.16;
          ctx.lineTo(x + bulge + (step % 2 === 0 ? r * 0.05 : -r * 0.05), y);
        }
        ctx.stroke();
      }
    });
    ctx.fillStyle = STEM;
    dot(ctx, 0, -r * 0.93, r * 0.06);
  } else if (tier === STONE) {
    // 방해 구슬: 금이 간 돌
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, -r * 0.35);
    ctx.lineTo(-r * 0.35, -r * 0.55);
    ctx.lineTo(-r * 0.2, -r * 0.8);
    ctx.moveTo(r * 0.75, r * 0.2);
    ctx.lineTo(r * 0.45, r * 0.5);
    stroke(ctx, accent, Math.max(0.8, r * 0.07));
  }
}

function eyes(ctx: Ctx, kind: Eyes, r: number): void {
  const x = r * 0.3;
  const y = -r * 0.02;
  const size = r * 0.075;
  const line = Math.max(1, r * 0.055);
  ctx.fillStyle = INK;
  const arcEye = (cx: number, up: boolean): void => {
    ctx.beginPath();
    if (up) ctx.arc(cx, y + size, size * 1.5, Math.PI * 1.15, Math.PI * 1.85);
    else ctx.arc(cx, y - size, size * 1.5, Math.PI * 0.15, Math.PI * 0.85);
    stroke(ctx, INK, line);
  };
  switch (kind) {
    case 'dot':
      dot(ctx, -x, y, size);
      dot(ctx, x, y, size);
      break;
    case 'wink':
      dot(ctx, -x, y, size * 1.15);
      arcEye(x, true);
      break;
    case 'closed':
      arcEye(-x, false);
      arcEye(x, false);
      break;
    case 'wide':
      for (const cx of [-x, x]) {
        ctx.fillStyle = '#ffffff';
        dot(ctx, cx, y, size * 1.9);
        ctx.fillStyle = INK;
        dot(ctx, cx, y, size * 0.9);
      }
      break;
    case 'happy':
      arcEye(-x, true);
      arcEye(x, true);
      break;
    case 'lash':
      for (const cx of [-x, x]) {
        dot(ctx, cx, y, size * 1.2);
        const out = Math.sign(cx);
        ctx.beginPath();
        ctx.moveTo(cx + out * size * 0.9, y - size * 0.7);
        ctx.lineTo(cx + out * size * 2.2, y - size * 1.7);
        ctx.moveTo(cx + out * size * 0.2, y - size * 1.1);
        ctx.lineTo(cx + out * size * 0.8, y - size * 2.3);
        stroke(ctx, INK, line * 0.8);
      }
      break;
    case 'squint':
      for (const cx of [-x, x]) {
        const out = Math.sign(cx);
        ctx.beginPath();
        ctx.moveTo(cx + out * size * 1.3, y - size * 1.1);
        ctx.lineTo(cx - out * size * 1.1, y);
        ctx.lineTo(cx + out * size * 1.3, y + size * 1.1);
        stroke(ctx, INK, line);
      }
      break;
    case 'side':
      for (const cx of [-x, x]) {
        ctx.fillStyle = '#ffffff';
        dot(ctx, cx, y, size * 1.6);
        ctx.fillStyle = INK;
        dot(ctx, cx + size * 0.7, y + size * 0.3, size * 0.9);
      }
      break;
    case 'cool':
      for (const cx of [-x, x]) {
        ctx.beginPath();
        ctx.roundRect(cx - size * 2.3, y - size * 1.5, size * 4.6, size * 3, size);
        ctx.fillStyle = '#22252b';
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(cx - size * 1.5, y - size * 0.9, size * 1.2, size * 0.5);
      }
      ctx.beginPath();
      ctx.moveTo(-x + size * 2.3, y - size * 0.6);
      ctx.lineTo(x - size * 2.3, y - size * 0.6);
      stroke(ctx, '#22252b', line);
      break;
    case 'line':
      for (const cx of [-x, x]) {
        ctx.beginPath();
        ctx.moveTo(cx - size * 1.5, y);
        ctx.lineTo(cx + size * 1.5, y);
        stroke(ctx, INK, line);
      }
      break;
    case 'sparkle':
      for (const cx of [-x, x]) {
        ctx.fillStyle = INK;
        dot(ctx, cx, y, size * 1.7);
        ctx.fillStyle = '#ffffff';
        dot(ctx, cx - size * 0.55, y - size * 0.6, size * 0.6);
        dot(ctx, cx + size * 0.6, y + size * 0.55, size * 0.3);
      }
      break;
    case 'angry':
      for (const cx of [-x, x]) {
        const out = Math.sign(cx);
        dot(ctx, cx, y + size * 0.4, size * 1.1);
        ctx.beginPath();
        ctx.moveTo(cx - out * size * 1.6, y - size * 0.6);
        ctx.lineTo(cx + out * size * 1.6, y - size * 2);
        stroke(ctx, INK, line);
      }
      break;
  }
}

function mouth(ctx: Ctx, kind: Mouth, r: number): void {
  const y = r * 0.24;
  const w = r * 0.17;
  const line = Math.max(1, r * 0.055);
  const halfMoon = (radius: number, fill: string): void => {
    ctx.beginPath();
    ctx.arc(0, y - radius * 0.25, radius, 0, Math.PI);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };
  switch (kind) {
    case 'smile':
      ctx.beginPath();
      ctx.arc(0, y - w * 0.5, w, Math.PI * 0.15, Math.PI * 0.85);
      stroke(ctx, INK, line);
      break;
    case 'cat':
      ctx.beginPath();
      ctx.arc(-w * 0.55, y - w * 0.3, w * 0.55, Math.PI * 0.05, Math.PI * 0.95);
      ctx.arc(w * 0.55, y - w * 0.3, w * 0.55, Math.PI * 0.05, Math.PI * 0.95);
      stroke(ctx, INK, line);
      break;
    case 'small':
      ctx.beginPath();
      ctx.arc(0, y - w * 0.2, w * 0.4, Math.PI * 0.1, Math.PI * 0.9);
      stroke(ctx, INK, line);
      break;
    case 'o':
      ctx.beginPath();
      ctx.ellipse(0, y + w * 0.1, w * 0.45, w * 0.6, 0, 0, Math.PI * 2);
      ctx.fillStyle = INK;
      ctx.fill();
      break;
    case 'beam':
      ctx.beginPath();
      ctx.arc(0, y - w * 1.1, w * 1.7, Math.PI * 0.2, Math.PI * 0.8);
      stroke(ctx, INK, line);
      break;
    case 'grin':
      halfMoon(w * 1.25, INK);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-w * 0.9, y - w * 0.3, w * 1.8, w * 0.3);
      break;
    case 'tongue':
      ctx.beginPath();
      ctx.arc(0, y - w * 0.5, w, Math.PI * 0.1, Math.PI * 0.9);
      stroke(ctx, INK, line);
      ctx.beginPath();
      ctx.arc(w * 0.35, y + w * 0.4, w * 0.42, 0, Math.PI);
      ctx.closePath();
      ctx.fillStyle = '#ff7a8a';
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
      ctx.quadraticCurveTo(w * 0.2, y + w * 0.5, w, y - w * 0.35);
      stroke(ctx, INK, line);
      break;
    case 'flat':
      ctx.beginPath();
      ctx.moveTo(-w * 0.7, y);
      ctx.lineTo(w * 0.7, y);
      stroke(ctx, INK, line);
      break;
    case 'open':
      halfMoon(w * 1.5, '#7a1f2b');
      ctx.beginPath();
      ctx.ellipse(0, y + w * 0.8, w * 0.75, w * 0.4, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#ff7a8a';
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
    ctx.fillStyle = 'rgba(255,90,120,0.32)';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(side * r * 0.52, r * 0.2, r * 0.13, r * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  eyes(ctx, expression.eyes, r);
  mouth(ctx, expression.mouth, r);
}

/**
 * 과일 한 개를 그립니다. 물리에서는 모두 원이므로 몸통은 원으로 두고,
 * 과일마다 꼭지·잎·무늬와 표정을 다르게 해서 구별합니다. 방해 구슬도 여기에서 그립니다.
 */
export function drawFruit(ctx: Ctx, tier: number, x: number, y: number, radius: number, angle = 0): void {
  const stone = tier === STONE;
  const kind = FRUITS[tier];
  if ((!kind && !stone) || radius <= 0) return;
  const color = stone ? '#9a9aa2' : kind.color;
  const accent = stone ? '#6c6c72' : kind.accent;
  // 아주 작게 그릴 때는 무늬와 얼굴이 뭉개지므로 색만 칠합니다.
  const detailed = radius >= 6;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (detailed && !stone) behind(ctx, tier, radius);

  disc(ctx, radius);
  ctx.fillStyle = color;
  ctx.fill();
  if (detailed) pattern(ctx, tier, radius);

  disc(ctx, radius);
  stroke(ctx, accent, Math.max(1, radius * 0.08));

  ctx.beginPath();
  ctx.ellipse(-radius * 0.42, -radius * 0.5, radius * 0.18, radius * 0.1, -0.6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fill();

  if (detailed) face(ctx, stone ? STONE_EXPRESSION : EXPRESSIONS[tier], radius);
  ctx.restore();
}
