import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LocalDriver } from "@/lib/storage/local";

// getStorage() is a module-level singleton in the real @/lib/storage, so
// swapping it out for a temp-dir LocalDriver per test needs a mock rather
// than env stubbing — `currentDriver` is read lazily inside the mocked
// getStorage(), by which point beforeEach has already set it.
let currentDriver: LocalDriver;
vi.mock("@/lib/storage", () => ({
  getStorage: () => currentDriver,
}));

const { readJson, mutateJson, mutateJsonDebounced, flushPendingWrites } = await import("./index");

let root: string;
let keyCounter = 0;
/** A fresh key per test avoids leaking state through the module-level
 * write-queue and debounce maps, which persist across tests in this file. */
function uniqueKey(): string {
  keyCounter += 1;
  return `test-${keyCounter}.json`;
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "recipery-store-"));
  currentDriver = new LocalDriver(root);
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("readJson", () => {
  it("returns null for a key that hasn't been written", async () => {
    expect(await readJson(uniqueKey())).toBeNull();
  });

  it("returns the parsed JSON for a key written directly through the driver", async () => {
    const key = uniqueKey();
    await currentDriver.put(key, Buffer.from(JSON.stringify({ hello: "world" })), "application/json");
    expect(await readJson<{ hello: string }>(key)).toEqual({ hello: "world" });
  });
});

describe("mutateJson", () => {
  it("writes the mutator's return value and returns it", async () => {
    const key = uniqueKey();
    const result = await mutateJson<{ count: number }>(key, () => ({ count: 1 }));
    expect(result).toEqual({ count: 1 });
    expect(await readJson(key)).toEqual({ count: 1 });
  });

  it("passes the current value to the mutator, null when nothing exists yet", async () => {
    const key = uniqueKey();
    await mutateJson<string[]>(key, (current) => {
      expect(current).toBeNull();
      return ["first"];
    });
    await mutateJson<string[]>(key, (current) => [...(current ?? []), "second"]);
    expect(await readJson(key)).toEqual(["first", "second"]);
  });

  it("serializes concurrent writes to the same key so none are lost", async () => {
    const key = uniqueKey();
    await mutateJson<{ count: number }>(key, () => ({ count: 0 }));

    const concurrentIncrements = 25;
    await Promise.all(
      Array.from({ length: concurrentIncrements }, () =>
        mutateJson<{ count: number }>(key, (current) => ({ count: (current?.count ?? 0) + 1 }))
      )
    );

    expect(await readJson<{ count: number }>(key)).toEqual({ count: concurrentIncrements });
  });

  it("keeps a rejecting mutator from blocking later writes to the same key", async () => {
    const key = uniqueKey();
    const failing = mutateJson(key, () => {
      throw new Error("boom");
    });
    const succeeding = mutateJson<{ ok: boolean }>(key, () => ({ ok: true }));

    await expect(failing).rejects.toThrow("boom");
    await expect(succeeding).resolves.toEqual({ ok: true });
    expect(await readJson(key)).toEqual({ ok: true });
  });
});

describe("mutateJsonDebounced / flushPendingWrites", () => {
  it("coalesces rapid calls into a single write of the latest mutator", async () => {
    // Real timers with a short debounce instead of vi.useFakeTimers() —
    // the debounced write goes through real filesystem I/O (LocalDriver),
    // and advancing fake timers doesn't reliably wait for that to settle.
    const key = uniqueKey();
    const putSpy = vi.spyOn(currentDriver, "put");
    const debounceMs = 20;

    mutateJsonDebounced<{ value: string }>(key, () => ({ value: "first" }), debounceMs);
    mutateJsonDebounced<{ value: string }>(key, () => ({ value: "second" }), debounceMs);
    mutateJsonDebounced<{ value: string }>(key, () => ({ value: "third" }), debounceMs);

    await new Promise((resolve) => setTimeout(resolve, debounceMs * 4));

    expect(putSpy).toHaveBeenCalledTimes(1);
    expect(await readJson(key)).toEqual({ value: "third" });
  });

  it("flushPendingWrites writes a pending debounced mutation immediately", async () => {
    const key = uniqueKey();
    mutateJsonDebounced<{ value: string }>(key, () => ({ value: "flushed" }), 10_000);

    await flushPendingWrites();

    expect(await readJson(key)).toEqual({ value: "flushed" });
  });
});
