import { describe, it, expect } from "vitest";
import { filterRecipes, isFiltersEmpty, collectRecipeTags, collectRecipeCuisines, EMPTY_RECIPE_FILTERS } from "./filter";
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

describe("isFiltersEmpty", () => {
  it("is true for the empty filters constant", () => {
    expect(isFiltersEmpty(EMPTY_RECIPE_FILTERS)).toBe(true);
  });

  it("is false once any facet has a value", () => {
    expect(isFiltersEmpty({ tags: ["dinner"], cuisines: [], difficulties: [] })).toBe(false);
    expect(isFiltersEmpty({ tags: [], cuisines: ["italian"], difficulties: [] })).toBe(false);
    expect(isFiltersEmpty({ tags: [], cuisines: [], difficulties: ["easy"] })).toBe(false);
  });
});

describe("filterRecipes", () => {
  const weeknight = makeRecipe({ id: "weeknight", tags: ["weeknight", "vegetarian"], cuisine: "Italian", difficulty: "easy" });
  const feast = makeRecipe({ id: "feast", tags: ["feast"], cuisine: "French", difficulty: "hard" });
  const untagged = makeRecipe({ id: "untagged" });

  it("returns everything when filters are empty", () => {
    expect(filterRecipes([weeknight, feast, untagged], EMPTY_RECIPE_FILTERS)).toEqual([weeknight, feast, untagged]);
  });

  it("ORs within a single facet — matching any one tag is enough", () => {
    const result = filterRecipes([weeknight, feast, untagged], {
      tags: ["weeknight", "feast"],
      cuisines: [],
      difficulties: [],
    });
    expect(result.map((r) => r.id)).toEqual(["weeknight", "feast"]);
  });

  it("ANDs across facets — must match tag AND cuisine AND difficulty", () => {
    const result = filterRecipes([weeknight, feast, untagged], {
      tags: ["weeknight"],
      cuisines: ["Italian"],
      difficulties: ["easy"],
    });
    expect(result.map((r) => r.id)).toEqual(["weeknight"]);
  });

  it("excludes a recipe missing the field entirely (no cuisine/difficulty set)", () => {
    const result = filterRecipes([weeknight, feast, untagged], {
      tags: [],
      cuisines: ["Italian"],
      difficulties: [],
    });
    expect(result.map((r) => r.id)).toEqual(["weeknight"]);
  });
});

describe("collectRecipeTags", () => {
  it("dedupes and sorts tags across recipes", () => {
    const recipes = [
      makeRecipe({ id: "a", tags: ["zucchini", "vegetarian"] }),
      makeRecipe({ id: "b", tags: ["vegetarian", "quick"] }),
    ];
    expect(collectRecipeTags(recipes)).toEqual(["quick", "vegetarian", "zucchini"]);
  });

  it("returns an empty array when no recipe has tags", () => {
    expect(collectRecipeTags([makeRecipe({ id: "a" })])).toEqual([]);
  });
});

describe("collectRecipeCuisines", () => {
  it("dedupes and sorts cuisines, skipping recipes with none", () => {
    const recipes = [
      makeRecipe({ id: "a", cuisine: "Italian" }),
      makeRecipe({ id: "b", cuisine: "French" }),
      makeRecipe({ id: "c" }),
      makeRecipe({ id: "d", cuisine: "Italian" }),
    ];
    expect(collectRecipeCuisines(recipes)).toEqual(["French", "Italian"]);
  });
});
