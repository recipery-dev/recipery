import { describe, it, expect } from "vitest";
import { parseTagsField, parseIngredientsField, parseStepsField, extToFor } from "./form";

describe("parseTagsField", () => {
  it("parses a JSON array of strings, trimming each one", () => {
    expect(parseTagsField(JSON.stringify(["weeknight", " vegetarian "]))).toEqual(["weeknight", "vegetarian"]);
  });

  it("drops blank and non-string entries", () => {
    expect(parseTagsField(JSON.stringify(["ok", "", "  ", 5, null]))).toEqual(["ok"]);
  });

  it("returns an empty array for malformed JSON", () => {
    expect(parseTagsField("not json")).toEqual([]);
  });

  it("returns an empty array for valid JSON that isn't an array", () => {
    expect(parseTagsField(JSON.stringify({ a: 1 }))).toEqual([]);
  });

  it("returns an empty array when the field isn't a string (e.g. a File)", () => {
    expect(parseTagsField(null)).toEqual([]);
  });
});

describe("parseIngredientsField", () => {
  it("keeps a provided id and trims fields", () => {
    const raw = JSON.stringify([{ id: "keep-me", quantity: " 2 ", unit: " cup ", name: " flour ", note: " sifted " }]);
    expect(parseIngredientsField(raw)).toEqual([
      { id: "keep-me", quantity: "2", unit: "cup", name: "flour", note: "sifted" },
    ]);
  });

  it("generates an id when none is provided", () => {
    const [ingredient] = parseIngredientsField(JSON.stringify([{ name: "salt" }]));
    expect(typeof ingredient.id).toBe("string");
    expect(ingredient.id.length).toBeGreaterThan(0);
  });

  it("drops entries with a missing or blank name", () => {
    const raw = JSON.stringify([{ name: "flour" }, { name: "" }, { name: "   " }, {}]);
    expect(parseIngredientsField(raw)).toEqual([expect.objectContaining({ name: "flour" })]);
  });

  it("leaves quantity/unit/note undefined when blank or missing", () => {
    const [ingredient] = parseIngredientsField(JSON.stringify([{ name: "salt", quantity: "", unit: "  " }]));
    expect(ingredient.quantity).toBeUndefined();
    expect(ingredient.unit).toBeUndefined();
    expect(ingredient.note).toBeUndefined();
  });

  it("returns an empty array for malformed input", () => {
    expect(parseIngredientsField("{not valid")).toEqual([]);
    expect(parseIngredientsField(JSON.stringify("just a string"))).toEqual([]);
  });
});

describe("parseStepsField", () => {
  it("preserves existing image metadata alongside trimmed text", () => {
    const raw = JSON.stringify([
      { id: "step-1", text: " Preheat the oven ", hasImage: true, imageExt: "jpg", imageUpdatedAt: "2024-01-01" },
    ]);
    expect(parseStepsField(raw)).toEqual([
      { id: "step-1", text: "Preheat the oven", hasImage: true, imageExt: "jpg", imageUpdatedAt: "2024-01-01" },
    ]);
  });

  it("defaults hasImage to false and leaves image fields undefined when absent", () => {
    const [step] = parseStepsField(JSON.stringify([{ text: "Mix" }]));
    expect(step.hasImage).toBe(false);
    expect(step.imageExt).toBeUndefined();
    expect(step.imageUpdatedAt).toBeUndefined();
  });

  it("drops steps with missing or blank text", () => {
    const raw = JSON.stringify([{ text: "Bake" }, { text: "" }, {}]);
    expect(parseStepsField(raw)).toEqual([expect.objectContaining({ text: "Bake" })]);
  });

  it("returns an empty array for malformed input", () => {
    expect(parseStepsField("nope")).toEqual([]);
  });
});

describe("extToFor", () => {
  it("derives the extension from a content type", () => {
    expect(extToFor("image/png")).toBe("png");
    expect(extToFor("image/webp")).toBe("webp");
  });

  it("normalizes jpeg to jpg", () => {
    expect(extToFor("image/jpeg")).toBe("jpg");
  });

  it("falls back to jpg for an unrecognized or empty content type", () => {
    expect(extToFor("")).toBe("jpg");
    expect(extToFor("garbage")).toBe("jpg");
  });
});
