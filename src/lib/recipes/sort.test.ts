import { describe, it, expect } from "vitest";
import { sortRecipes } from "./sort";
import type { Recipe } from "./types";

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

describe("sortRecipes", () => {
  it("does not mutate the input array", () => {
    const recipes = [makeRecipe({ id: "a", addedAt: "2024-01-01" }), makeRecipe({ id: "b", addedAt: "2024-02-01" })];
    const original = [...recipes];
    sortRecipes(recipes, "recent");
    expect(recipes).toEqual(original);
  });

  it("'recent' orders by addedAt, newest first", () => {
    const a = makeRecipe({ id: "a", addedAt: "2024-01-01" });
    const b = makeRecipe({ id: "b", addedAt: "2024-03-01" });
    const c = makeRecipe({ id: "c", addedAt: "2024-02-01" });
    expect(sortRecipes([a, b, c], "recent").map((r) => r.id)).toEqual(["b", "c", "a"]);
  });

  it("'recently-cooked' treats a never-cooked recipe as oldest", () => {
    const cooked = makeRecipe({ id: "cooked", lastCookedAt: "2024-05-01" });
    const never = makeRecipe({ id: "never" });
    expect(sortRecipes([never, cooked], "recently-cooked").map((r) => r.id)).toEqual(["cooked", "never"]);
  });

  it("'title' sorts alphabetically", () => {
    const b = makeRecipe({ id: "b", title: "Banana Bread" });
    const a = makeRecipe({ id: "a", title: "Apple Pie" });
    expect(sortRecipes([b, a], "title").map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("'rating' sorts highest first and breaks ties by title", () => {
    const unrated = makeRecipe({ id: "unrated", title: "Z" });
    const fiveStarZ = makeRecipe({ id: "five-z", title: "Zucchini", rating: 5 });
    const fiveStarA = makeRecipe({ id: "five-a", title: "Apple", rating: 5 });
    const threeStars = makeRecipe({ id: "three", title: "M", rating: 3 });
    expect(sortRecipes([unrated, threeStars, fiveStarZ, fiveStarA], "rating").map((r) => r.id)).toEqual([
      "five-a",
      "five-z",
      "three",
      "unrated",
    ]);
  });

  it("'cooked' puts cooked recipes first and breaks ties by title", () => {
    const cookedZ = makeRecipe({ id: "cooked-z", title: "Zucchini", cooked: true });
    const cookedA = makeRecipe({ id: "cooked-a", title: "Apple", cooked: true });
    const notCooked = makeRecipe({ id: "not-cooked", title: "A" });
    expect(sortRecipes([notCooked, cookedZ, cookedA], "cooked").map((r) => r.id)).toEqual([
      "cooked-a",
      "cooked-z",
      "not-cooked",
    ]);
  });

  it("'quickest' sorts by total prep+cook time and puts recipes with no time last", () => {
    const noTime = makeRecipe({ id: "no-time" });
    const slow = makeRecipe({ id: "slow", prepMinutes: 30, cookMinutes: 60 });
    const fast = makeRecipe({ id: "fast", prepMinutes: 5, cookMinutes: 10 });
    expect(sortRecipes([slow, noTime, fast], "quickest").map((r) => r.id)).toEqual(["fast", "slow", "no-time"]);
  });

  it("'quickest' breaks a tie between two recipes with no time by title", () => {
    const b = makeRecipe({ id: "b", title: "Banana" });
    const a = makeRecipe({ id: "a", title: "Apple" });
    expect(sortRecipes([b, a], "quickest").map((r) => r.id)).toEqual(["a", "b"]);
  });
});
