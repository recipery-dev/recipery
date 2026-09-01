import { describe, it, expect } from "vitest";
import { parseQuantityToNumber, formatNumberAsQuantity, scaleQuantity } from "./scale";

describe("parseQuantityToNumber", () => {
  it("parses plain integers and decimals", () => {
    expect(parseQuantityToNumber("2")).toBe(2);
    expect(parseQuantityToNumber("0.5")).toBe(0.5);
  });

  it("parses simple fractions", () => {
    expect(parseQuantityToNumber("1/2")).toBe(0.5);
    expect(parseQuantityToNumber("3/4")).toBe(0.75);
  });

  it("parses mixed numbers", () => {
    expect(parseQuantityToNumber("1 1/2")).toBe(1.5);
    expect(parseQuantityToNumber("2 3/4")).toBe(2.75);
  });

  it("parses unicode vulgar fractions", () => {
    expect(parseQuantityToNumber("¼")).toBe(0.25);
    expect(parseQuantityToNumber("½")).toBe(0.5);
  });

  it("returns null for non-numeric quantities", () => {
    expect(parseQuantityToNumber("a pinch")).toBeNull();
    expect(parseQuantityToNumber("to taste")).toBeNull();
    expect(parseQuantityToNumber("")).toBeNull();
    expect(parseQuantityToNumber("   ")).toBeNull();
  });
});

describe("formatNumberAsQuantity", () => {
  it("returns whole numbers without a fraction", () => {
    expect(formatNumberAsQuantity(2)).toBe("2");
  });

  it("snaps a remainder just above a whole number down to it", () => {
    expect(formatNumberAsQuantity(2.01)).toBe("2");
  });

  it("snaps close fractional remainders to the nearest nice fraction", () => {
    expect(formatNumberAsQuantity(0.5)).toBe("1/2");
    expect(formatNumberAsQuantity(1.5)).toBe("1 1/2");
    expect(formatNumberAsQuantity(0.333)).toBe("1/3");
    expect(formatNumberAsQuantity(2.25)).toBe("2 1/4");
    // 0.37 lands within the 0.02 snap tolerance of 3/8 (0.375).
    expect(formatNumberAsQuantity(1.37)).toBe("1 3/8");
  });

  it("falls back to a rounded decimal when nothing snaps", () => {
    expect(formatNumberAsQuantity(1.4)).toBe("1.4");
  });

  it("returns 0 for zero or negative input", () => {
    expect(formatNumberAsQuantity(0)).toBe("0");
    expect(formatNumberAsQuantity(-3)).toBe("0");
  });
});

describe("scaleQuantity", () => {
  it("scales a parseable quantity by the factor", () => {
    expect(scaleQuantity("2", 2)).toBe("4");
    expect(scaleQuantity("1/2", 2)).toBe("1");
    expect(scaleQuantity("1", 0.5)).toBe("1/2");
  });

  it("leaves a non-numeric quantity untouched", () => {
    expect(scaleQuantity("a pinch", 2)).toBe("a pinch");
  });

  it("leaves an undefined quantity untouched", () => {
    expect(scaleQuantity(undefined, 2)).toBeUndefined();
  });

  it("short-circuits and returns the original string when the factor is 1", () => {
    // Notably returns the original string as-is, not a reformatted version
    // of the same number — "1.0" stays "1.0" rather than becoming "1".
    expect(scaleQuantity("1.0", 1)).toBe("1.0");
  });
});
