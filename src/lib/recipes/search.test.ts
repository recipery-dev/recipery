import { describe, it, expect } from "vitest";
import { recipeMatchesQuery } from "./search";

const recipe = {
  title: "Dracula Cake",
  source: "Grandma's Notebook",
  tags: ["Dessert", "Halloween"],
  ingredients: [
    { id: "1", name: "Filling", isGroup: true },
    { id: "2", name: "Dark chocolate" },
  ],
};

describe("recipeMatchesQuery", () => {
  it("matches title, source, tags, and ingredients, ignoring case", () => {
    expect(recipeMatchesQuery(recipe, "dracula")).toBe(true);
    expect(recipeMatchesQuery(recipe, "NOTEBOOK")).toBe(true);
    expect(recipeMatchesQuery(recipe, "halloween")).toBe(true);
    expect(recipeMatchesQuery(recipe, "chocolate")).toBe(true);
  });

  it("does not match section headers", () => {
    expect(recipeMatchesQuery(recipe, "filling")).toBe(false);
  });

  it("matches nothing for a blank query", () => {
    expect(recipeMatchesQuery(recipe, "   ")).toBe(false);
  });
});
