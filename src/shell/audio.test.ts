import { afterEach, describe, expect, it, vi } from "vitest";
import { createAudio } from "./audio";

class StubOscillator {
  type = "";
  frequency = { value: 0 };
  connect = vi.fn().mockReturnThis();
  start = vi.fn();
  stop = vi.fn();
}

class StubGain {
  gain = { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() };
  connect = vi.fn().mockReturnThis();
}

function stubAudioContext(initialState: "running" | "suspended" = "running") {
  const instances: StubAudioContextInstance[] = [];

  class StubAudioContextInstance {
    currentTime = 0;
    state: "running" | "suspended" = initialState;
    createOscillator = vi.fn(() => new StubOscillator());
    createGain = vi.fn(() => new StubGain());
    resume = vi.fn();
    destination = {};
    constructor() {
      instances.push(this);
    }
  }

  vi.stubGlobal("AudioContext", StubAudioContextInstance);
  return instances;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createAudio", () => {
  it("starts muted or unmuted per the constructor argument", () => {
    expect(createAudio(true).isMuted()).toBe(true);
    expect(createAudio(false).isMuted()).toBe(false);
  });

  it("toggleMuted flips and returns the new state", () => {
    const audio = createAudio(false);
    expect(audio.toggleMuted()).toBe(true);
    expect(audio.isMuted()).toBe(true);
    expect(audio.toggleMuted()).toBe(false);
  });

  it("never constructs an AudioContext while muted", () => {
    const instances = stubAudioContext();
    const audio = createAudio(true);
    audio.play("eat");
    expect(instances).toHaveLength(0);
  });

  it("constructs the AudioContext lazily, on first play, when unmuted", () => {
    const instances = stubAudioContext();
    const audio = createAudio(false);
    expect(instances).toHaveLength(0);
    audio.play("eat");
    expect(instances).toHaveLength(1);
    audio.play("death");
    expect(instances).toHaveLength(1);
  });

  it("primeContext constructs the AudioContext even when muted", () => {
    const instances = stubAudioContext();
    const audio = createAudio(true);
    expect(instances).toHaveLength(0);
    audio.primeContext();
    expect(instances).toHaveLength(1);
  });

  it("primeContext resumes an existing suspended context", () => {
    const instances = stubAudioContext("suspended");
    const audio = createAudio(false);
    audio.primeContext();
    expect(instances).toHaveLength(1);
    expect(instances[0].resume).toHaveBeenCalledTimes(1);
  });

  it("primeContext swallows a throwing AudioContext constructor instead of propagating", () => {
    vi.stubGlobal(
      "AudioContext",
      class {
        constructor() {
          throw new Error("Web Audio disabled");
        }
      },
    );
    const audio = createAudio(true);
    expect(() => audio.primeContext()).not.toThrow();
  });

  it("primeContext does not create an unhandled rejection when resume() is refused", async () => {
    vi.stubGlobal(
      "AudioContext",
      class {
        state = "suspended";
        resume = vi.fn(() => Promise.reject(new Error("resume refused")));
      },
    );
    const audio = createAudio(false);
    expect(() => audio.primeContext()).not.toThrow();
    // Give the microtask queue a turn to flush the (caught) rejection.
    await Promise.resolve();
  });
});
