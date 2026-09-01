/**
 * Turns freeform ingredient text — pasted from a recipe site, a video
 * description, or typed by hand — into structured quantity/unit/name
 * fields. Shared by the URL/YouTube scraper (server) and the recipe form's
 * "Paste list" bulk-add (client), so both split "500g Plain flour" the
 * same way.
 */

export interface ParsedIngredient {
  quantity?: string;
  unit?: string;
  name: string;
}

// Matches a unit at the start of the remaining text and normalizes it to the
// same short form the edit form's unit dropdown uses (UNIT_OPTIONS in
// recipe-form-drawer.tsx), so "Tablespoon", "TABLESPOON", "Table Spoon", and
// "tbsp." all land as the recognized "tbsp" option instead of falling back
// to free text. Order matters: longer/more specific patterns are listed
// before shorter ones they could otherwise be mistaken for a prefix of
// (e.g. "lb" must be tried before the bare "l" abbreviation, or "l\.?" would
// match just the "l" in "lb" and leave a stray "b" in the ingredient name).
// `(?=\s|$)` (rather than `\b`) is the boundary check so an optional
// trailing period — "tbsp." — is consumed cleanly instead of being left
// dangling in front of the ingredient name.
const UNIT_ALIASES: { pattern: RegExp; canonical: string }[] = [
  { pattern: /^cups?(?=\s|$)/i, canonical: "cup" },
  { pattern: /^(?:teaspoons?|tea\s*spoons?|tsps?\.?)(?=\s|$)/i, canonical: "tsp" },
  { pattern: /^(?:tablespoons?|table\s*spoons?|tbsps?\.?|tbls?\.?\s*spoons?)(?=\s|$)/i, canonical: "tbsp" },
  { pattern: /^(?:fluid\s*ounces?|fl\.?\s*oz\.?)(?=\s|$)/i, canonical: "fl oz" },
  { pattern: /^(?:ounces?|oz\.?)(?=\s|$)/i, canonical: "oz" },
  { pattern: /^(?:pounds?|lbs?\.?)(?=\s|$)/i, canonical: "lb" },
  { pattern: /^(?:pints?|pts?\.?)(?=\s|$)/i, canonical: "pt" },
  { pattern: /^(?:quarts?|qts?\.?)(?=\s|$)/i, canonical: "qt" },
  { pattern: /^(?:gallons?|gal\.?)(?=\s|$)/i, canonical: "gal" },
  { pattern: /^(?:kilograms?|kgs?\.?)(?=\s|$)/i, canonical: "kg" },
  { pattern: /^(?:milliliters?|millilitres?|mls?\.?)(?=\s|$)/i, canonical: "ml" },
  { pattern: /^(?:liters?|litres?)(?=\s|$)/i, canonical: "l" },
  { pattern: /^(?:grams?|gr\.?)(?=\s|$)/i, canonical: "g" },
  { pattern: /^pinch(?:es)?(?=\s|$)/i, canonical: "pinch" },
  { pattern: /^dash(?:es)?(?=\s|$)/i, canonical: "dash" },
  { pattern: /^cloves?(?=\s|$)/i, canonical: "clove" },
  { pattern: /^cans?(?=\s|$)/i, canonical: "can" },
  { pattern: /^(?:packages?|packs?|pkgs?\.?)(?=\s|$)/i, canonical: "package" },
  { pattern: /^slices?(?=\s|$)/i, canonical: "slice" },
  { pattern: /^sticks?(?=\s|$)/i, canonical: "stick" },
  { pattern: /^(?:pieces?|pcs?\.?)(?=\s|$)/i, canonical: "piece" },
  // Bare single-letter abbreviations last, once every longer word above has
  // had a chance to match — see the note on ordering above.
  { pattern: /^g\.?(?=\s|$)/i, canonical: "g" },
  { pattern: /^l\.?(?=\s|$)/i, canonical: "l" },
];

export const INGREDIENT_QUANTITY_PATTERN =
  /^(\d+\s+\d+\/\d+|\d+\/\d+|\d*\.?\d+|[¼½¾⅓⅔⅛⅜⅝⅞])\s*/;

export function parseIngredientLine(rawLine: string): ParsedIngredient {
  const line = rawLine.trim();
  const quantityMatch = line.match(INGREDIENT_QUANTITY_PATTERN);
  if (!quantityMatch) return { name: line };

  const quantity = quantityMatch[1];
  const afterQuantity = line.slice(quantityMatch[0].length).trim();

  for (const { pattern, canonical } of UNIT_ALIASES) {
    const match = afterQuantity.match(pattern);
    if (match) {
      const name = afterQuantity.slice(match[0].length).trim();
      return { quantity, unit: canonical, name: name || afterQuantity };
    }
  }

  return { quantity, name: afterQuantity || line };
}

/** Splits pasted text into one ingredient per non-empty line. */
export function parseIngredientListText(text: string): ParsedIngredient[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseIngredientLine);
}
