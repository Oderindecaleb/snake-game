type BlipKind = "eat" | "turn" | "death";

const BLIP_FREQUENCY: Record<BlipKind, number> = {
  eat: 880,
  turn: 220,
  death: 110,
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
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "square";
      oscillator.frequency.value = BLIP_FREQUENCY[kind];
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.12);
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

  function setMuted(value: boolean): void {
    muted = value;
  }

  function toggleMuted(): boolean {
    muted = !muted;
    return muted;
  }

  return { play, primeContext, isMuted, setMuted, toggleMuted };
}
