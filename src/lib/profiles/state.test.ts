import { describe, it, expect } from "vitest";
import { applyProfileState } from "./state";
import type { RecipeRecord } from "@/lib/recipes/types";

function makeRecord(overrides: Partial<RecipeRecord> = {}): RecipeRecord {
  return {
    id: "dracula-cake",
    title: "Dracula Cake",
    tags: [],
    ingredients: [],
    steps: [],
    addedAt: "2024-01-01T00:00:00.000Z",
    hasImage: false,
    ...overrides,
  };
}

describe("applyProfileState", () => {
  it("defaults favorite/cooked to false and leaves rating/lastCookedAt unset when there's no state", () => {
    const recipe = applyProfileState(makeRecord());
    expect(recipe.favorite).toBe(false);
    expect(recipe.cooked).toBe(false);
    expect(recipe.rating).toBeUndefined();
    expect(recipe.lastCookedAt).toBeUndefined();
  });

  it("carries over the profile's rating, favorite, cooked, and lastCookedAt", () => {
    const recipe = applyProfileState(makeRecord(), {
      rating: 4,
      favorite: true,
      cooked: true,
      lastCookedAt: "2024-06-01T00:00:00.000Z",
    });
    expect(recipe.rating).toBe(4);
    expect(recipe.favorite).toBe(true);
    expect(recipe.cooked).toBe(true);
    expect(recipe.lastCookedAt).toBe("2024-06-01T00:00:00.000Z");
  });

  it("coerces a partial state's missing favorite/cooked to false rather than undefined", () => {
    const recipe = applyProfileState(makeRecord(), { rating: 5 });
    expect(recipe.favorite).toBe(false);
    expect(recipe.cooked).toBe(false);
  });

  it("resolves coverUrl from the record's image fields", () => {
    const withImage = applyProfileState(makeRecord({ hasImage: true, coverExt: "jpg" }));
    expect(withImage.coverUrl).toBe("/api/files/recipes/dracula-cake/image.jpg");

    const withoutImage = applyProfileState(makeRecord());
    expect(withoutImage.coverUrl).toBeNull();
  });

  it("falls back to a YouTube thumbnail when there's no cover but there is a video", () => {
    const withVideo = applyProfileState(
      makeRecord({ videoUrl: "https://www.youtube.com/watch?v=abc123" })
    );
    expect(withVideo.coverUrl).toBe("https://img.youtube.com/vi/abc123/mqdefault.jpg");

    // An uploaded cover still wins over the video fallback.
    const withBoth = applyProfileState(
      makeRecord({ hasImage: true, coverExt: "jpg", videoUrl: "https://www.youtube.com/watch?v=abc123" })
    );
    expect(withBoth.coverUrl).toBe("/api/files/recipes/dracula-cake/image.jpg");

    // A non-YouTube video link has no thumbnail to fall back to.
    const withOtherVideo = applyProfileState(makeRecord({ videoUrl: "https://vimeo.com/12345" }));
    expect(withOtherVideo.coverUrl).toBeNull();
  });

  it("preserves the rest of the record's fields unchanged", () => {
    const record = makeRecord({ description: "Spooky and delicious" });
    const recipe = applyProfileState(record);
    expect(recipe.title).toBe(record.title);
    expect(recipe.description).toBe("Spooky and delicious");
  });
});
