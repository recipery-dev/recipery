import { describe, it, expect } from "vitest";
import { computeSmartCollections } from "./smart";
import type { Recipe } from "@/lib/recipes/types";

function makeRecipe(overrides: Partial<Recipe> & { id: string }): Recipe {
  return {
    title: overrides.id,
    tags: [],
    ingredients: [],
    steps: [],
    addedAt: "2024-01-01T00:00:00.000Z",
    hasImage: false,
    coverUrl: null,
    ...overrides,
  };
}

describe("computeSmartCollections", () => {
  const recipes: Recipe[] = [
    makeRecipe({ id: "a", favorite: true, cooked: true, rating: 5 }),
    makeRecipe({ id: "b", cooked: true, rating: 3 }),
    makeRecipe({ id: "c" }),
    makeRecipe({ id: "d", rating: 5 }),
  ];

  it("buckets favorites", () => {
    const [favorites] = computeSmartCollections(recipes);
    expect(favorites.id).toBe("favorite");
    expect(favorites.recipeIds).toEqual(["a"]);
  });

  it("buckets cooked and never-cooked as complements of each other", () => {
    const collections = computeSmartCollections(recipes);
    const cooked = collections.find((c) => c.id === "cooked")!;
    const neverCooked = collections.find((c) => c.id === "never-cooked")!;
    expect(cooked.recipeIds).toEqual(["a", "b"]);
    expect(neverCooked.recipeIds).toEqual(["c", "d"]);
  });

  it("buckets 5-star recipes regardless of cooked/favorite status", () => {
    const collections = computeSmartCollections(recipes);
    const fiveStar = collections.find((c) => c.id === "5-star")!;
    expect(fiveStar.recipeIds).toEqual(["a", "d"]);
  });

  it("returns empty buckets for an empty library", () => {
    for (const collection of computeSmartCollections([])) {
      expect(collection.recipeIds).toEqual([]);
    }
  });
});
