export interface Sound {
  muted: boolean;
  /** 브라우저는 사용자가 누른 뒤에만 소리를 낼 수 있으므로, 버튼을 눌렀을 때 부릅니다. */
  unlock(): void;
  toggle(): void;
  drop(): void;
  merge(tier: number): void;
  over(): void;
  win(): void;
  /** 대기실에 사람이 들어왔을 때. */
  join(): void;
  /** 대기실에서 누군가 준비했을 때. */
  ready(): void;
}

/** 음원 파일 없이 Web Audio로 효과음을 합성합니다. 소리를 낼 수 없는 환경에서는 아무 일도 하지 않습니다. */
export function createAudio(): Sound {
  let context: AudioContext | null = null;

  const tone = (frequency: number, seconds: number, type: OscillatorType, delay = 0, volume = 0.18): void => {
    if (sound.muted || !context) return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + seconds);
  };

  const sound: Sound = {
    muted: false,
    unlock() {
      try {
        context ??= new AudioContext();
        void context.resume();
      } catch {
        context = null;
      }
    },
    toggle() {
      sound.muted = !sound.muted;
    },
    drop: () => tone(300, 0.08, 'sine', 0, 0.12),
    // 단계가 높을수록 낮은 소리를 냅니다.
    merge: (tier) => {
      const base = 720 - tier * 45;
      tone(base, 0.12, 'triangle');
      tone(base * 1.5, 0.16, 'triangle', 0.06);
    },
    over: () => {
      tone(330, 0.25, 'sawtooth', 0, 0.1);
      tone(220, 0.4, 'sawtooth', 0.2, 0.1);
    },
    join: () => {
      tone(520, 0.1, 'sine', 0, 0.14);
      tone(780, 0.14, 'sine', 0.09, 0.14);
    },
    ready: () => tone(660, 0.12, 'triangle', 0, 0.14),
    win: () => {
      [523, 659, 784, 1047].forEach((frequency, i) => tone(frequency, 0.22, 'triangle', i * 0.12));
    },
  };
  return sound;
}
