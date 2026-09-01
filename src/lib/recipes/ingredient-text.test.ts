import { describe, it, expect } from "vitest";
import { parseIngredientLine, parseIngredientListText } from "./ingredient-text";

describe("parseIngredientLine", () => {
  it("splits quantity, unit, and name for a metric line", () => {
    expect(parseIngredientLine("500g Plain flour")).toEqual({
      quantity: "500",
      unit: "g",
      name: "Plain flour",
    });
  });

  it("normalizes verbose unit spellings to their short form", () => {
    expect(parseIngredientLine("2 tablespoons olive oil")).toEqual({
      quantity: "2",
      unit: "tbsp",
      name: "olive oil",
    });
    expect(parseIngredientLine("1 Teaspoon vanilla extract")).toEqual({
      quantity: "1",
      unit: "tsp",
      name: "vanilla extract",
    });
    expect(parseIngredientLine("3 lbs. chicken thighs")).toEqual({
      quantity: "3",
      unit: "lb",
      name: "chicken thighs",
    });
  });

  it("tries longer unit words before the single-letter abbreviations they'd otherwise be mistaken for", () => {
    expect(parseIngredientLine("1 lb butter")).toEqual({ quantity: "1", unit: "lb", name: "butter" });
    expect(parseIngredientLine("2 l water")).toEqual({ quantity: "2", unit: "l", name: "water" });
  });

  it("leaves quantity-only lines with no unit", () => {
    expect(parseIngredientLine("1 egg")).toEqual({ quantity: "1", name: "egg" });
    expect(parseIngredientLine("2 onions, diced")).toEqual({ quantity: "2", name: "onions, diced" });
  });

  it("handles fractional and mixed-number quantities, including unicode fractions", () => {
    expect(parseIngredientLine("1/2 cup sugar")).toEqual({ quantity: "1/2", unit: "cup", name: "sugar" });
    expect(parseIngredientLine("1 1/2 cups flour")).toEqual({ quantity: "1 1/2", unit: "cup", name: "flour" });
    expect(parseIngredientLine("¼ tsp salt")).toEqual({ quantity: "¼", unit: "tsp", name: "salt" });
  });

  it("treats a line with no leading quantity as a bare name", () => {
    expect(parseIngredientLine("Salt to taste")).toEqual({ name: "Salt to taste" });
  });

  it("trims surrounding whitespace", () => {
    expect(parseIngredientLine("  200g milk  ")).toEqual({ quantity: "200", unit: "g", name: "milk" });
  });
});

describe("parseIngredientListText", () => {
  it("parses one ingredient per non-empty line, in order", () => {
    const text = ["200g milk", "70g water", "7g yeast", "1 egg", "60g sugar", "50g oil", "500g flour"].join("\n");

    expect(parseIngredientListText(text)).toEqual([
      { quantity: "200", unit: "g", name: "milk" },
      { quantity: "70", unit: "g", name: "water" },
      { quantity: "7", unit: "g", name: "yeast" },
      { quantity: "1", name: "egg" },
      { quantity: "60", unit: "g", name: "sugar" },
      { quantity: "50", unit: "g", name: "oil" },
      { quantity: "500", unit: "g", name: "flour" },
    ]);
  });

  it("skips blank lines and tolerates CRLF line endings", () => {
    const text = "200g milk\r\n\r\n1 egg\n\n\n500g flour";
    expect(parseIngredientListText(text)).toEqual([
      { quantity: "200", unit: "g", name: "milk" },
      { quantity: "1", name: "egg" },
      { quantity: "500", unit: "g", name: "flour" },
    ]);
  });

  it("returns an empty array for blank input", () => {
    expect(parseIngredientListText("   \n\n  ")).toEqual([]);
  });
});
