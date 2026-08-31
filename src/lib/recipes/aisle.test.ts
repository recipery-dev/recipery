import { describe, it, expect } from "vitest";
import { guessAisle } from "./aisle";

describe("guessAisle", () => {
  it("matches common ingredients to their aisle", () => {
    expect(guessAisle("yellow onion")).toBe("Produce");
    expect(guessAisle("chicken breast")).toBe("Meat & Seafood");
    expect(guessAisle("whole milk")).toBe("Dairy & Eggs");
    expect(guessAisle("sandwich bread")).toBe("Bakery");
    expect(guessAisle("frozen peas")).toBe("Frozen");
    expect(guessAisle("orange juice")).toBe("Beverages");
    expect(guessAisle("all-purpose flour")).toBe("Pantry");
  });

  it("picks the more specific (longer) keyword match", () => {
    expect(guessAisle("tomato")).toBe("Produce");
    expect(guessAisle("tomato paste")).toBe("Pantry");
  });

  it("falls back to Other for unrecognized ingredients", () => {
    expect(guessAisle("truffle shavings")).toBe("Other");
  });
});
