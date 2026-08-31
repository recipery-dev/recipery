/**
 * Best-effort volume/weight → gram conversion for the ingredient list's
 * "(~120g)" hint. Static and offline: fixed unit constants plus a small
 * curated density table for common baking staples, keyed by substring match
 * against the ingredient's free-text name. Not lab-precision — good enough
 * for an approximate "~" hint, not for baking to the gram.
 */

const WEIGHT_TO_GRAMS: Record<string, number> = {
  g: 1,
  kg: 1000,
  oz: 28.3495,
  lb: 453.592,
};

// Milliliters per volume unit (US customary).
const VOLUME_TO_ML: Record<string, number> = {
  ml: 1,
  l: 1000,
  tsp: 4.92892,
  tbsp: 14.7868,
  "fl oz": 29.5735,
  cup: 236.588,
  pt: 473.176,
  qt: 946.353,
  gal: 3785.41,
};

interface DensityEntry {
  keyword: string;
  gramsPerCup: number;
}

const DENSITY_TABLE: DensityEntry[] = [
  { keyword: "all-purpose flour", gramsPerCup: 120 },
  { keyword: "all purpose flour", gramsPerCup: 120 },
  { keyword: "bread flour", gramsPerCup: 127 },
  { keyword: "cake flour", gramsPerCup: 114 },
  { keyword: "whole wheat flour", gramsPerCup: 113 },
  { keyword: "flour", gramsPerCup: 120 },
  { keyword: "brown sugar", gramsPerCup: 220 },
  { keyword: "powdered sugar", gramsPerCup: 120 },
  { keyword: "granulated sugar", gramsPerCup: 200 },
  { keyword: "sugar", gramsPerCup: 200 },
  { keyword: "butter", gramsPerCup: 227 },
  { keyword: "olive oil", gramsPerCup: 216 },
  { keyword: "vegetable oil", gramsPerCup: 218 },
  { keyword: "oil", gramsPerCup: 218 },
  { keyword: "shortening", gramsPerCup: 205 },
  { keyword: "buttermilk", gramsPerCup: 245 },
  { keyword: "milk", gramsPerCup: 245 },
  { keyword: "heavy cream", gramsPerCup: 238 },
  { keyword: "sour cream", gramsPerCup: 240 },
  { keyword: "yogurt", gramsPerCup: 245 },
  { keyword: "water", gramsPerCup: 236 },
  { keyword: "honey", gramsPerCup: 340 },
  { keyword: "maple syrup", gramsPerCup: 322 },
  { keyword: "rice", gramsPerCup: 185 },
  { keyword: "rolled oats", gramsPerCup: 90 },
  { keyword: "oats", gramsPerCup: 90 },
  { keyword: "cocoa powder", gramsPerCup: 84 },
  { keyword: "cornstarch", gramsPerCup: 128 },
  { keyword: "baking powder", gramsPerCup: 220 },
  { keyword: "baking soda", gramsPerCup: 230 },
  { keyword: "salt", gramsPerCup: 292 },
];

// Longest keyword wins (e.g. "brown sugar" over "sugar") regardless of the
// table's declaration order.
const SORTED_DENSITY_TABLE = [...DENSITY_TABLE].sort((a, b) => b.keyword.length - a.keyword.length);

function findDensity(ingredientName: string): number | null {
  const lower = ingredientName.toLowerCase();
  const match = SORTED_DENSITY_TABLE.find((entry) => lower.includes(entry.keyword));
  return match ? match.gramsPerCup : null;
}

/**
 * Converts an already-scaled numeric quantity to an approximate gram
 * weight. Returns null when it can't be converted: unit missing/not
 * recognized, quantity <= 0, or (for volume units) no density-table keyword
 * match against the ingredient name.
 */
export function convertToGrams(quantity: number, unit: string, ingredientName: string): number | null {
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  const normalizedUnit = unit.trim().toLowerCase();

  if (normalizedUnit in WEIGHT_TO_GRAMS) {
    return quantity * WEIGHT_TO_GRAMS[normalizedUnit];
  }

  if (normalizedUnit in VOLUME_TO_ML) {
    const gramsPerCup = findDensity(ingredientName);
    if (gramsPerCup === null) return null;
    const gramsPerMl = gramsPerCup / VOLUME_TO_ML.cup;
    return quantity * VOLUME_TO_ML[normalizedUnit] * gramsPerMl;
  }

  return null;
}

/** Formats a raw gram amount for the inline hint, e.g. 118.9 -> "~120g". */
export function formatGrams(grams: number): string {
  const rounded = grams < 20 ? Math.round(grams) : Math.round(grams / 5) * 5;
  return `~${rounded}g`;
}
