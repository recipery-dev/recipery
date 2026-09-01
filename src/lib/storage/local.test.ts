import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LocalDriver } from "./local";

async function readAll(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf-8");
}

describe("LocalDriver", () => {
  let root: string;
  let driver: LocalDriver;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "recipery-local-driver-"));
    driver = new LocalDriver(root);
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("round-trips a buffer through put and get", async () => {
    await driver.put("recipes/dracula-cake/metadata.json", Buffer.from('{"title":"Dracula Cake"}'), "application/json");
    const content = await readAll(await driver.get("recipes/dracula-cake/metadata.json"));
    expect(content).toBe('{"title":"Dracula Cake"}');
  });

  it("creates intermediate directories as needed", async () => {
    await driver.put("a/b/c/file.txt", Buffer.from("nested"), "text/plain");
    expect(await readAll(await driver.get("a/b/c/file.txt"))).toBe("nested");
  });

  it("leaves no .tmp file behind after a successful put", async () => {
    await driver.put("recipes/dracula-cake/image.jpg", Buffer.from("fake-image-bytes"), "image/jpeg");
    const entries = await readdir(join(root, "recipes/dracula-cake"));
    expect(entries).toEqual(["image.jpg"]);
  });

  it("overwrites an existing key rather than appending", async () => {
    await driver.put("index.json", Buffer.from("first"), "application/json");
    await driver.put("index.json", Buffer.from("second"), "application/json");
    expect(await readAll(await driver.get("index.json"))).toBe("second");
  });

  describe("exists", () => {
    it("is true after a put and false for a key that was never written", async () => {
      await driver.put("index.json", Buffer.from("{}"), "application/json");
      expect(await driver.exists("index.json")).toBe(true);
      expect(await driver.exists("missing.json")).toBe(false);
    });
  });

  describe("delete", () => {
    it("removes the file so exists reports false afterwards", async () => {
      await driver.put("index.json", Buffer.from("{}"), "application/json");
      await driver.delete("index.json");
      expect(await driver.exists("index.json")).toBe(false);
    });

    it("doesn't throw when deleting a key that was never written", async () => {
      await expect(driver.delete("never-existed.json")).resolves.toBeUndefined();
    });
  });

  describe("list", () => {
    it("walks nested directories and returns forward-slash-separated keys", async () => {
      await driver.put("recipes/a/metadata.json", Buffer.from("{}"), "application/json");
      await driver.put("recipes/b/metadata.json", Buffer.from("{}"), "application/json");
      await driver.put("index.json", Buffer.from("[]"), "application/json");

      const keys = (await driver.list("recipes")).sort();
      expect(keys).toEqual(["recipes/a/metadata.json", "recipes/b/metadata.json"]);
    });

    it("returns an empty array for a prefix that doesn't exist", async () => {
      expect(await driver.list("nothing-here")).toEqual([]);
    });
  });

  describe("signedUrl", () => {
    it("always returns null — the local driver can't sign URLs", async () => {
      await driver.put("index.json", Buffer.from("{}"), "application/json");
      expect(await driver.signedUrl("index.json", 3600)).toBeNull();
    });
  });
});
