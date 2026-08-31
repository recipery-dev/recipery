import { describe, it, expect } from "vitest";
import { convertToGrams, formatGrams } from "./convert";

describe("convertToGrams", () => {
  it("converts weight units without needing a density match", () => {
    expect(convertToGrams(2, "lb", "an ingredient not in the density table")).toBeCloseTo(907.184, 1);
    expect(convertToGrams(1, "oz", "anything")).toBeCloseTo(28.3495, 3);
    expect(convertToGrams(1, "kg", "anything")).toBe(1000);
    expect(convertToGrams(500, "g", "anything")).toBe(500);
  });

  it("converts volume units using the density table", () => {
    expect(convertToGrams(1, "cup", "all-purpose flour")).toBeCloseTo(120, 0);
    expect(convertToGrams(1, "cup", "flour")).toBeCloseTo(120, 0);
  });

  it("picks the more specific (longer) keyword match", () => {
    const sugar = convertToGrams(1, "cup", "sugar")!;
    const brownSugar = convertToGrams(1, "cup", "brown sugar")!;
    expect(sugar).toBeCloseTo(200, 0);
    expect(brownSugar).toBeCloseTo(220, 0);
    expect(brownSugar).not.toBeCloseTo(sugar, 0);

    const oil = convertToGrams(1, "cup", "oil")!;
    const oliveOil = convertToGrams(1, "cup", "olive oil")!;
    expect(oil).toBeCloseTo(218, 0);
    expect(oliveOil).toBeCloseTo(216, 0);
  });

  it("returns null for an ingredient not in the density table", () => {
    expect(convertToGrams(1, "cup", "chopped walnuts")).toBeNull();
  });

  it("returns null for an unrecognized unit", () => {
    expect(convertToGrams(1, "pinch", "salt")).toBeNull();
    expect(convertToGrams(1, "clove", "garlic")).toBeNull();
  });

  it("returns null for a non-positive or non-finite quantity", () => {
    expect(convertToGrams(0, "cup", "flour")).toBeNull();
    expect(convertToGrams(-1, "cup", "flour")).toBeNull();
    expect(convertToGrams(NaN, "cup", "flour")).toBeNull();
  });
});

describe("formatGrams", () => {
  it("rounds to the nearest gram below 20g", () => {
    expect(formatGrams(4.9)).toBe("~5g");
    expect(formatGrams(19.4)).toBe("~19g");
  });

  it("rounds to the nearest 5g at or above 20g", () => {
    expect(formatGrams(20)).toBe("~20g");
    expect(formatGrams(118.9)).toBe("~120g");
    expect(formatGrams(907.184)).toBe("~905g");
  });
});
