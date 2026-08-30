/**
 * Best-effort quantity scaler for the servings +/- control. Ingredient
 * quantities are free text ("2", "1/2", "1 1/2", "a pinch") — anything that
 * doesn't parse as a plain number, simple fraction, or mixed number is left
 * untouched rather than mangled.
 */

const UNICODE_FRACTIONS: Record<string, number> = {
  "¼": 1 / 4,
  "½": 1 / 2,
  "¾": 3 / 4,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "⅛": 1 / 8,
  "⅜": 3 / 8,
  "⅝": 5 / 8,
  "⅞": 7 / 8,
};

// Common cooking fractions, checked in order so e.g. 0.333 snaps to 1/3
// before the coarser 1/4-step candidates get a chance.
const NICE_FRACTIONS: [number, string][] = [
  [1 / 8, "1/8"],
  [1 / 4, "1/4"],
  [1 / 3, "1/3"],
  [3 / 8, "3/8"],
  [1 / 2, "1/2"],
  [5 / 8, "5/8"],
  [2 / 3, "2/3"],
  [3 / 4, "3/4"],
  [7 / 8, "7/8"],
];

function parseQuantityToNumber(raw: string): number | null {
  const qty = raw.trim();
  if (!qty) return null;

  if (qty in UNICODE_FRACTIONS) return UNICODE_FRACTIONS[qty];

  const mixed = qty.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const [, whole, num, den] = mixed;
    return Number(whole) + Number(num) / Number(den);
  }

  const fraction = qty.match(/^(\d+)\/(\d+)$/);
  if (fraction) {
    const [, num, den] = fraction;
    return Number(num) / Number(den);
  }

  const plain = qty.match(/^\d*\.?\d+$/);
  if (plain) return Number(qty);

  return null;
}

function formatNumberAsQuantity(n: number): string {
  if (n <= 0) return "0";

  const whole = Math.floor(n);
  const frac = n - whole;

  if (frac < 0.02) return String(whole || n.toFixed(2).replace(/\.?0+$/, ""));

  for (const [value, label] of NICE_FRACTIONS) {
    if (Math.abs(frac - value) < 0.02) {
      return whole > 0 ? `${whole} ${label}` : label;
    }
  }

  const rounded = Math.round(n * 100) / 100;
  return String(rounded);
}

/** Returns the scaled quantity string, or the original if it can't be parsed as a number. */
export function scaleQuantity(qty: string | undefined, factor: number): string | undefined {
  if (!qty || factor === 1) return qty;
  const parsed = parseQuantityToNumber(qty);
  if (parsed === null) return qty;
  return formatNumberAsQuantity(parsed * factor);
}
