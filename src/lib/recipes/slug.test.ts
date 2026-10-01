import { describe, it, expect } from "vitest";
import { slugify, uniqueSlug } from "./slug";

describe("slugify", () => {
  it("lowercases and hyphenates a normal title", () => {
    expect(slugify("Grandma's Lasagna")).toBe("grandma-s-lasagna");
  });

  it("collapses runs of non-alphanumeric characters into one hyphen", () => {
    expect(slugify("Mac & Cheese!!  (Extra Cheesy)")).toBe("mac-cheese-extra-cheesy");
  });

  it("strips diacritics", () => {
    expect(slugify("Crème Brûlée")).toBe("creme-brulee");
    expect(slugify("Jalapeño Poppers")).toBe("jalapeno-poppers");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("-- Dracula Cake --")).toBe("dracula-cake");
  });

  it("caps length at 60 characters without leaving a trailing hyphen", () => {
    const long = "a".repeat(65);
    const slug = slugify(long);
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("falls back to 'recipe' when nothing alphanumeric survives", () => {
    expect(slugify("🎂🎂🎂")).toBe("recipe");
    expect(slugify("")).toBe("recipe");
    expect(slugify("---")).toBe("recipe");
  });
});

describe("uniqueSlug", () => {
  it("returns the base slug untouched when it isn't taken", () => {
    expect(uniqueSlug("lasagna", new Set())).toBe("lasagna");
  });

  it("appends -2 when the base slug is taken", () => {
    expect(uniqueSlug("lasagna", new Set(["lasagna"]))).toBe("lasagna-2");
  });

  it("keeps incrementing until it finds a free slug", () => {
    const taken = new Set(["lasagna", "lasagna-2", "lasagna-3"]);
    expect(uniqueSlug("lasagna", taken)).toBe("lasagna-4");
  });
});
