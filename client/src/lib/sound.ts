const SOUND_ENABLED_KEY = "codenames.soundEnabled";

let audioContext: AudioContext | null = null;

export function isSoundEnabled(): boolean {
  try {
    return window.localStorage.getItem(SOUND_ENABLED_KEY) === "true";
  } catch {
    return false;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
  } catch {
    // ignored in restricted browser contexts
  }
}

function getAudioContext(): AudioContext | null {
  if (audioContext) return audioContext;
  const AudioContextConstructor =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioContextConstructor) return null;
  audioContext = new AudioContextConstructor();
  return audioContext;
}

type GameplaySound =
  | "select"
  | "confirm"
  | "hint"
  | "pass"
  | "take"
  | "win"
  | "lose";

const SOUND_SEQUENCES: Record<GameplaySound, Array<[number, number]>> = {
  select: [[260, 0.08]],
  confirm: [
    [420, 0.1],
    [560, 0.1],
    [720, 0.16],
  ],
  hint: [
    [330, 0.08],
    [440, 0.08],
    [660, 0.18],
  ],
  pass: [
    [360, 0.09],
    [240, 0.16],
  ],
  take: [
    [300, 0.08],
    [450, 0.08],
    [600, 0.14],
  ],
  win: [
    [392, 0.1],
    [494, 0.1],
    [587, 0.1],
    [784, 0.28],
  ],
  lose: [
    [330, 0.14],
    [262, 0.14],
    [196, 0.3],
  ],
};

export function playActionSound(kind: GameplaySound): void {
  if (!isSoundEnabled()) return;

  const context = getAudioContext();
  if (!context) return;

  void context.resume();
  const sequence = SOUND_SEQUENCES[kind];
  let offset = 0;
  for (const [frequency, duration] of sequence) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + offset;
    oscillator.type = kind === "lose" ? "square" : "triangle";
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.045, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
    offset += duration + 0.018;
  }
}
