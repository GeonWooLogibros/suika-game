export interface Input {
  /** 키보드로 누르고 있는 방향. 왼쪽 -1, 오른쪽 1, 없으면 0입니다. */
  axis(): number;
  /** 마지막으로 가리킨 화면의 가로 좌표. 읽고 나면 비워집니다. */
  takePointer(): number | null;
  /** 놓기 입력이 있었는지 여부. 읽고 나면 지워집니다. */
  takeDrop(): boolean;
}

/** 터치, 마우스, 키보드 입력을 모아 둡니다. 게임은 프레임마다 모아 둔 값을 읽어 갑니다. */
export function attachInput(canvas: HTMLCanvasElement): Input {
  let left = false;
  let right = false;
  let pointer: number | null = null;
  let drop = false;
  let down = false;

  canvas.addEventListener('pointerdown', (event) => {
    down = true;
    pointer = event.clientX;
    canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (down || event.pointerType === 'mouse') pointer = event.clientX;
  });
  canvas.addEventListener('pointerup', (event) => {
    if (!down) return;
    down = false;
    pointer = event.clientX;
    drop = true;
  });
  canvas.addEventListener('pointercancel', () => {
    down = false;
  });

  const typing = (event: KeyboardEvent): boolean =>
    event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement;

  window.addEventListener('keydown', (event) => {
    if (typing(event)) return;
    if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') left = true;
    else if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') right = true;
    else if (event.key === ' ' || event.key === 'ArrowDown') {
      // 키를 누르고 있을 때 반복해서 오는 입력은 놓기로 세지 않습니다.
      if (!event.repeat) drop = true;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') left = false;
    if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') right = false;
  });
  window.addEventListener('blur', () => {
    left = false;
    right = false;
    down = false;
  });

  return {
    axis: () => (right ? 1 : 0) - (left ? 1 : 0),
    takePointer: () => {
      const value = pointer;
      pointer = null;
      return value;
    },
    takeDrop: () => {
      const value = drop;
      drop = false;
      return value;
    },
  };
}
