import { BIN_H, BIN_W } from '../game/fruits';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Layout {
  /** 내 통이 그려지는 화면 위의 자리. */
  bin: Rect;
  /** 통 안의 좌표 1이 화면에서 차지하는 길이. */
  scale: number;
  hud: Rect;
  /** 상대의 통이 그려지는 자리. 이름표는 각 자리의 바로 위에 씁니다. */
  rivals: Rect[];
}

const PAD = 8;
const GAP = 8;
const HUD_H = 56;
/** 상대의 통 위에 이름과 점수를 쓰는 줄의 높이. */
const LABEL_H = 22;
export const MAX_RIVALS = 3;

/** 화면 크기와 상대의 수에 맞춰 통의 자리를 정합니다. 가로로 넓으면 상대를 옆에, 아니면 위쪽 한 줄에 둡니다. */
export function computeLayout(width: number, height: number, rivals: number): Layout {
  const count = Math.max(0, Math.min(MAX_RIVALS, Math.floor(rivals) || 0));
  const hud: Rect = { x: PAD, y: PAD, w: Math.max(1, width - PAD * 2), h: HUD_H };
  const areaX = PAD;
  let areaY = PAD + HUD_H + GAP;
  let areaW = Math.max(1, width - PAD * 2);
  let areaH = Math.max(1, height - areaY - PAD);
  const rects: Rect[] = [];

  // 가로로 넓으면 상대의 통을 내 통 오른쪽 기둥에 둡니다. 가로 위치는 내 통의 크기가 정해진 뒤에 맞춥니다.
  const side = count > 0 && width > height;
  let columnW = 0;
  if (side) {
    columnW = Math.min(220, areaW * 0.28);
    const cellH = Math.min((areaH - GAP * (count - 1)) / count, (columnW * BIN_H) / BIN_W + LABEL_H);
    const h = Math.max(1, cellH - LABEL_H);
    const w = (h * BIN_W) / BIN_H;
    for (let i = 0; i < count; i++) rects.push({ x: 0, y: areaY + i * (cellH + GAP) + LABEL_H, w, h });
    areaW -= columnW + GAP * 2;
  } else if (count > 0) {
    const rowH = Math.min(130, areaH * 0.22);
    const h = Math.max(1, rowH - LABEL_H);
    const w = (h * BIN_W) / BIN_H;
    const cellW = areaW / count;
    for (let i = 0; i < count; i++) {
      rects.push({ x: areaX + cellW * i + (cellW - w) / 2, y: areaY + LABEL_H, w, h });
    }
    areaY += rowH + GAP;
    areaH -= rowH + GAP;
  }

  const scale = Math.max(0.01, Math.min(areaW / BIN_W, areaH / BIN_H));
  const w = BIN_W * scale;
  const h = BIN_H * scale;
  let binX = areaX + (areaW - w) / 2;
  if (side) {
    // 내 통과 기둥을 한 묶음으로 화면 가운데에 두어서, 상대의 통이 화면 구석으로 멀어지지 않게 합니다.
    const groupW = w + GAP * 2 + columnW;
    binX = areaX + (areaW + GAP * 2 + columnW - groupW) / 2;
    for (const rect of rects) rect.x = binX + w + GAP * 2 + (columnW - rect.w) / 2;
  }
  return {
    bin: { x: binX, y: areaY + (areaH - h) / 2, w, h },
    scale,
    hud,
    rivals: rects,
  };
}

/** 화면의 가로 좌표를 통 안의 좌표로 바꿉니다. */
export function toBinX(clientX: number, layout: Layout): number {
  return (clientX - layout.bin.x) / layout.scale;
}
