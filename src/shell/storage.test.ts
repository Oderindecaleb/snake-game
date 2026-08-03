import { afterEach, describe, expect, it, vi } from "vitest";
import { loadBests, loadMuted, recordScore, saveBests, saveMuted } from "./storage";

function stubLocalStorage(overrides: Partial<Storage> = {}) {
  const store = new Map<string, string>();
  const stub: Storage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: () => null,
    get length() {
      return store.size;
    },
    ...overrides,
  };
  vi.stubGlobal("localStorage", stub);
  return stub;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loadBests", () => {
  it("returns an empty object when nothing is stored", () => {
    stubLocalStorage();
    expect(loadBests()).toEqual({});
  });

  it("returns the stored bests when valid", () => {
    const stub = stubLocalStorage();
    stub.setItem("snake.bests.v1", JSON.stringify({ 1: 40, 4: 120 }));
    expect(loadBests()).toEqual({ 1: 40, 4: 120 });
  });

  it("discards corrupt JSON", () => {
    const stub = stubLocalStorage();
    stub.setItem("snake.bests.v1", "{not json");
    expect(loadBests()).toEqual({});
  });

  it("discards structurally invalid data", () => {
    const stub = stubLocalStorage();
    stub.setItem("snake.bests.v1", JSON.stringify({ 1: "not a number", 99: 5 }));
    expect(loadBests()).toEqual({});
  });

  it("falls back to empty when localStorage throws", () => {
    stubLocalStorage({
      getItem: () => {
        throw new Error("blocked");
      },
    });
    expect(loadBests()).toEqual({});
  });
});

describe("saveBests", () => {
  it("does not throw when localStorage.setItem throws", () => {
    stubLocalStorage({
      setItem: () => {
        throw new Error("blocked");
      },
    });
    expect(() => saveBests({ 1: 10 })).not.toThrow();
  });
});

describe("recordScore", () => {
  it("reports a new best and updates it when the score is higher", () => {
    stubLocalStorage();
    const result = recordScore({ 2: 10 }, 2, 15);
    expect(result.isNewBest).toBe(true);
    expect(result.bests).toEqual({ 2: 15 });
  });

  it("does not update or flag a new best when the score is lower or equal", () => {
    stubLocalStorage();
    const result = recordScore({ 2: 10 }, 2, 10);
    expect(result.isNewBest).toBe(false);
    expect(result.bests).toEqual({ 2: 10 });
  });

  it("treats a missing level as a best of 0", () => {
    stubLocalStorage();
    const result = recordScore({}, 5, 1);
    expect(result.isNewBest).toBe(true);
    expect(result.bests).toEqual({ 5: 1 });
  });
});

describe("loadMuted", () => {
  it("defaults to muted when nothing is stored", () => {
    stubLocalStorage();
    expect(loadMuted()).toBe(true);
  });

  it("reads a stored unmuted preference", () => {
    const stub = stubLocalStorage();
    stub.setItem("snake.muted.v1", "false");
    expect(loadMuted()).toBe(false);
  });

  it("falls back to muted when localStorage throws", () => {
    stubLocalStorage({
      getItem: () => {
        throw new Error("blocked");
      },
    });
    expect(loadMuted()).toBe(true);
  });
});

describe("saveMuted", () => {
  it("does not throw when localStorage.setItem throws", () => {
    stubLocalStorage({
      setItem: () => {
        throw new Error("blocked");
      },
    });
    expect(() => saveMuted(false)).not.toThrow();
  });
});
