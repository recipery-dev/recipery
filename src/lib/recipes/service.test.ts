import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LocalDriver } from "@/lib/storage/local";

let currentDriver: LocalDriver;
vi.mock("@/lib/storage", () => ({ getStorage: () => currentDriver }));

const service = await import("./service");
const { readJson } = await import("@/lib/store");
const { updateSettings } = await import("@/lib/settings/store");
import type { RecipeFields, RecipeRecord } from "./types";

let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "recipery-service-"));
  currentDriver = new LocalDriver(root);
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

function fields(overrides: Partial<RecipeFields> = {}): RecipeFields {
  return {
    title: "Pancakes",
    tags: ["breakfast"],
    ingredients: [{ id: "i1", name: "flour", quantity: "2", unit: "cup" }],
    steps: [
      { id: "s1", text: "Mix", hasImage: false },
      { id: "s2", text: "Fry", hasImage: false },
    ],
    ...overrides,
  };
}

const png = (size = 10) => ({ data: Buffer.alloc(size, 1), contentType: "image/png" });

describe("createRecipe", () => {
  it("writes the record and the index, with a unique slug id", async () => {
    const a = await service.createRecipe(fields());
    const b = await service.createRecipe(fields());
    expect(a.id).toBe("pancakes");
    expect(b.id).toBe("pancakes-2");
    expect((await service.listRecipeRecords()).map((r) => r.id)).toEqual(["pancakes", "pancakes-2"]);
    expect(await readJson<RecipeRecord>("recipes/pancakes/metadata.json")).toMatchObject({ title: "Pancakes" });
  });

  it("stores a cover and step photos", async () => {
    const record = await service.createRecipe(fields(), { cover: png(), steps: { s1: png() } });
    expect(record.hasImage).toBe(true);
    expect(record.coverExt).toBe("png");
    expect(record.steps[0]).toMatchObject({ hasImage: true, imageExt: "png" });
    expect(record.steps[1].hasImage).toBe(false);
    expect(await currentDriver.list("recipes/pancakes/")).toContain("recipes/pancakes/image.png");
  });

  it("rejects a photo over the size limit before writing anything", async () => {
    await updateSettings({ imageMaxSizeMb: 1 });
    await expect(
      service.createRecipe(fields(), { cover: png(1024 * 1024 + 1), steps: {} })
    ).rejects.toMatchObject({ status: 413 });
    expect(await service.listRecipeRecords()).toEqual([]);
    expect(await currentDriver.list("recipes/")).toEqual([]);
  });
});

describe("updateRecipe", () => {
  it("replaces fields and keeps the record in the index in sync", async () => {
    const created = await service.createRecipe(fields());
    const updated = await service.updateRecipe(created.id, fields({ title: "Better Pancakes", tags: [] }));
    expect(updated.title).toBe("Better Pancakes");
    expect((await service.listRecipeRecords())[0].title).toBe("Better Pancakes");
    expect(updated.addedAt).toBe(created.addedAt);
  });

  it("404s for an unknown recipe", async () => {
    await expect(service.updateRecipe("nope", fields())).rejects.toMatchObject({ status: 404 });
  });

  it("removes the cover on request", async () => {
    const created = await service.createRecipe(fields(), { cover: png(), steps: {} });
    const updated = await service.updateRecipe(created.id, fields(), { removeCover: true, steps: {} });
    expect(updated.hasImage).toBe(false);
    expect(await currentDriver.list(`recipes/${created.id}/`)).not.toContain(`recipes/${created.id}/image.png`);
  });

  it("deletes the photo of a step that was dropped", async () => {
    const created = await service.createRecipe(fields(), { steps: { s1: png() } });
    await service.updateRecipe(created.id, fields({ steps: [{ id: "s2", text: "Fry", hasImage: false }] }));
    expect(await currentDriver.list(`recipes/${created.id}/steps/`)).toEqual([]);
  });
});

describe("mergeRecipeFields", () => {
  const existing = (): RecipeRecord => ({
    ...fields({ description: "Fluffy", cuisine: "American", servings: 4 }),
    id: "pancakes",
    addedAt: "2026-01-01T00:00:00.000Z",
    hasImage: false,
    steps: [
      { id: "s1", text: "Mix", hasImage: true, imageExt: "jpg" },
      { id: "s2", text: "Fry", hasImage: false },
    ],
  });

  it("leaves fields that were not sent alone", () => {
    const merged = service.mergeRecipeFields(existing(), { title: "New" });
    expect(merged).toMatchObject({ title: "New", description: "Fluffy", cuisine: "American", servings: 4 });
  });

  it("clears a field with null", () => {
    const merged = service.mergeRecipeFields(existing(), { description: null, servings: null });
    expect(merged.description).toBeUndefined();
    expect(merged.servings).toBeUndefined();
    expect(merged.cuisine).toBe("American");
  });

  it("keeps a step's photo when its id or text still matches", () => {
    const merged = service.mergeRecipeFields(existing(), {
      steps: [{ text: "Mix" }, { id: "s2", text: "Fry gently" }, { text: "Serve" }],
    });
    expect(merged.steps[0]).toMatchObject({ id: "s1", hasImage: true, imageExt: "jpg" });
    expect(merged.steps[1]).toMatchObject({ id: "s2", text: "Fry gently" });
    expect(merged.steps[2]).toMatchObject({ text: "Serve", hasImage: false });
    expect(merged.steps[2].id).not.toBe("s1");
  });
});

describe("duplicateRecipe", () => {
  it("copies the record and its photos under a new id", async () => {
    const created = await service.createRecipe(fields(), { cover: png(), steps: { s1: png() } });
    const copy = await service.duplicateRecipe(created.id);
    expect(copy).toMatchObject({ id: "pancakes-2", title: "Pancakes (Copy)" });
    const keys = await currentDriver.list("recipes/pancakes-2/");
    expect(keys).toContain("recipes/pancakes-2/image.png");
    expect(keys).toContain("recipes/pancakes-2/steps/s1.png");
  });
});

describe("deleteRecipe", () => {
  it("removes files, the index entry, and every profile's state for it", async () => {
    const created = await service.createRecipe(fields(), { cover: png(), steps: {} });
    await service.setRecipeState("default", created.id, { favorite: true });
    await service.deleteRecipe(created.id);
    expect(await service.listRecipeRecords()).toEqual([]);
    expect(await currentDriver.list("recipes/")).toEqual([]);
    expect(await readJson("profiles/default/state.json")).toEqual({});
  });

  it("404s for an unknown recipe", async () => {
    await expect(service.deleteRecipe("nope")).rejects.toMatchObject({ status: 404 });
  });
});

describe("setRecipeState", () => {
  it("sets rating, favorite, and cooked for a profile, and 0 clears the rating", async () => {
    const created = await service.createRecipe(fields());
    const rated = await service.setRecipeState("default", created.id, { rating: 4, favorite: true, cooked: true });
    expect(rated).toMatchObject({ rating: 4, favorite: true, cooked: true });
    expect(rated.lastCookedAt).toBeTruthy();

    const cleared = await service.setRecipeState("default", created.id, { rating: 0 });
    expect(cleared.rating).toBeUndefined();
    expect(cleared.favorite).toBe(true);
  });

  it("rejects a bad rating", async () => {
    const created = await service.createRecipe(fields());
    await expect(service.setRecipeState("default", created.id, { rating: 6 })).rejects.toMatchObject({ status: 400 });
    await expect(service.setRecipeState("default", created.id, { rating: 2.5 })).rejects.toMatchObject({ status: 400 });
  });

  it("keeps state separate per profile", async () => {
    const created = await service.createRecipe(fields());
    await service.setRecipeState("a", created.id, { favorite: true });
    expect((await service.getRecipeForProfile("a", created.id)).favorite).toBe(true);
    expect((await service.getRecipeForProfile("b", created.id)).favorite).toBe(false);
  });
});

describe("importRecipeFromUrl", () => {
  it("validates the url before doing anything", async () => {
    await expect(service.importRecipeFromUrl("  ")).rejects.toMatchObject({ status: 400 });
    await expect(service.importRecipeFromUrl("not a url")).rejects.toMatchObject({ status: 400 });
    await expect(service.importRecipeFromUrl("ftp://x.test/r")).rejects.toMatchObject({ status: 400 });
  });
});
