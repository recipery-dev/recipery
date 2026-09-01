import { describe, it, expect } from "vitest";
import { buildShoppingList } from "./shopping";
import { convertToGrams, formatGrams } from "./convert";
import type { Recipe, RecipeIngredient } from "./types";

let nextId = 0;
function ingredient(overrides: Partial<RecipeIngredient> & { name: string }): RecipeIngredient {
  nextId += 1;
  return { id: `ing-${nextId}`, ...overrides };
}

function makeRecipe(id: string, title: string, ingredients: RecipeIngredient[]): Recipe {
  return {
    id,
    title,
    tags: [],
    ingredients,
    steps: [],
    addedAt: "2024-01-01T00:00:00.000Z",
    hasImage: false,
    coverUrl: null,
  };
}

describe("buildShoppingList", () => {
  it("merges the same unitless ingredient across recipes by summing quantities", () => {
    const a = makeRecipe("a", "Recipe A", [ingredient({ name: "egg", quantity: "2" })]);
    const b = makeRecipe("b", "Recipe B", [ingredient({ name: "egg", quantity: "1" })]);

    const [line] = buildShoppingList([
      { recipe: a, factor: 1 },
      { recipe: b, factor: 1 },
    ]);

    expect(line.name).toBe("egg");
    expect(line.amounts).toEqual(["3"]);
  });

  it("scales quantities by each recipe's factor before merging", () => {
    const a = makeRecipe("a", "Recipe A", [ingredient({ name: "egg", quantity: "1" })]);
    const [line] = buildShoppingList([{ recipe: a, factor: 3 }]);
    expect(line.amounts).toEqual(["3"]);
  });

  it("merges gram-convertible cross-unit quantities into a single gram total", () => {
    const a = makeRecipe("a", "Recipe A", [ingredient({ name: "flour", quantity: "1", unit: "cup" })]);
    const b = makeRecipe("b", "Recipe B", [ingredient({ name: "flour", quantity: "60", unit: "g" })]);

    const [line] = buildShoppingList([
      { recipe: a, factor: 1 },
      { recipe: b, factor: 1 },
    ]);

    const cupInGrams = convertToGrams(1, "cup", "flour")!;
    const expectedTotal = formatGrams(cupInGrams + 60);
    expect(line.amounts).toEqual([expectedTotal]);
  });

  it("keeps unmergeable units separate instead of combining them", () => {
    const a = makeRecipe("a", "Recipe A", [
      ingredient({ name: "salt", quantity: "1", unit: "pinch" }),
      ingredient({ name: "salt", quantity: "2", unit: "dash" }),
    ]);

    const [line] = buildShoppingList([{ recipe: a, factor: 1 }]);

    expect(line.amounts).toContain("1 pinch");
    expect(line.amounts).toContain("2 dash");
  });

  it("keeps a non-numeric quantity as its own literal line", () => {
    const a = makeRecipe("a", "Recipe A", [ingredient({ name: "salt", quantity: "a pinch" })]);
    const [line] = buildShoppingList([{ recipe: a, factor: 1 }]);
    expect(line.amounts).toEqual(["a pinch"]);
  });

  it("skips ingredients with a blank name", () => {
    const a = makeRecipe("a", "Recipe A", [ingredient({ name: "   ", quantity: "1" })]);
    expect(buildShoppingList([{ recipe: a, factor: 1 }])).toEqual([]);
  });

  it("lists each contributing recipe once, even with duplicate ingredient rows in one recipe", () => {
    const a = makeRecipe("a", "Recipe A", [
      ingredient({ name: "salt", quantity: "1" }),
      ingredient({ name: "salt", quantity: "1" }),
    ]);
    const [line] = buildShoppingList([{ recipe: a, factor: 1 }]);
    expect(line.fromRecipes).toEqual([{ recipeId: "a", recipeTitle: "Recipe A" }]);
  });

  it("dedupes identical notes", () => {
    const a = makeRecipe("a", "Recipe A", [
      ingredient({ name: "onion", quantity: "1", note: "diced" }),
      ingredient({ name: "onion", quantity: "1", note: "diced" }),
    ]);
    const [line] = buildShoppingList([{ recipe: a, factor: 1 }]);
    expect(line.notes).toEqual(["diced"]);
  });

  it("assigns a supermarket aisle via the shared aisle guesser", () => {
    const a = makeRecipe("a", "Recipe A", [ingredient({ name: "yellow onion", quantity: "1" })]);
    const [line] = buildShoppingList([{ recipe: a, factor: 1 }]);
    expect(line.aisle).toBe("Produce");
  });

  it("sorts the output alphabetically by name", () => {
    const a = makeRecipe("a", "Recipe A", [
      ingredient({ name: "Zucchini", quantity: "1" }),
      ingredient({ name: "apple", quantity: "1" }),
      ingredient({ name: "Mango", quantity: "1" }),
    ]);
    const lines = buildShoppingList([{ recipe: a, factor: 1 }]);
    expect(lines.map((l) => l.name)).toEqual(["apple", "Mango", "Zucchini"]);
  });
});
