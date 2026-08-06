type BlipKind = "eat" | "turn" | "death" | "die";

interface BlipConfig {
  type: OscillatorType;
  frequency: number;
  rampSeconds: number;
  gain: number;
}

const BLIP_CONFIG: Record<BlipKind, BlipConfig> = {
  eat: { type: "triangle", frequency: 660, rampSeconds: 0.12, gain: 0.07 },
  turn: { type: "square", frequency: 220, rampSeconds: 0.12, gain: 0.05 },
  death: { type: "square", frequency: 110, rampSeconds: 0.12, gain: 0.05 },
  die: { type: "sawtooth", frequency: 130, rampSeconds: 0.35, gain: 0.07 },
};

export function createAudio(initiallyMuted: boolean) {
  let context: AudioContext | null = null;
  let muted = initiallyMuted;

  function ensureContext(): AudioContext {
    if (!context) {
      context = new AudioContext();
    }
    return context;
  }

  function play(kind: BlipKind): void {
    if (muted) {
      return;
    }
    try {
      const ctx = ensureContext();
      const config = BLIP_CONFIG[kind];
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = config.type;
      oscillator.frequency.value = config.frequency;
      gain.gain.setValueAtTime(config.gain, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + config.rampSeconds);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + config.rampSeconds);
    } catch {
      // AudioContext construction/playback can throw or be unavailable (e.g. old iOS
      // Safari, Web Audio disabled). Audio failing should degrade to "no sound",
      // never break the game loop that calls play() (see src/main.ts handleTick /
      // src/shell/loop.ts frame()).
    }
  }

  function primeContext(): void {
    try {
      const ctx = ensureContext();
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
    } catch {
      // AudioContext construction/resume can throw or be unavailable (e.g. old iOS
      // Safari, Web Audio disabled). Audio failing should degrade to "no sound",
      // never break keyboard/touch input handling (see src/main.ts listeners).
    }
  }

  function isMuted(): boolean {
    return muted;
  }

  function toggleMuted(): boolean {
    muted = !muted;
    return muted;
  }

  return { play, primeContext, isMuted, toggleMuted };
}
