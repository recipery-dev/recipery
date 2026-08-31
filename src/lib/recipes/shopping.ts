/**
 * Consolidates ingredients from multiple (already servings-scaled) recipes
 * into one shopping list. Merging is conservative: only combines quantities
 * it's confident about (same name, same unit, or gram-convertible via the
 * density table already used for the ingredient gram-weight hint) — anything
 * ambiguous (non-numeric quantities like "a pinch", or incompatible units)
 * is kept as a separate literal line rather than silently mis-combined.
 */

import { parseQuantityToNumber, formatNumberAsQuantity } from "./scale";
import { convertToGrams, formatGrams } from "./convert";
import type { Recipe } from "./types";

export interface ShoppingListLine {
  /** name.trim().toLowerCase() — the grouping key, also usable as a checked-off key */
  key: string;
  /** first-seen display casing */
  name: string;
  /** one or more non-mergeable amount strings, e.g. ["2 cups", "~120g"] */
  amounts: string[];
  /** deduped ingredient notes */
  notes: string[];
  fromRecipes: { recipeId: string; recipeTitle: string }[];
}

interface ScaledItem {
  recipeId: string;
  recipeTitle: string;
  name: string;
  /** normalized (trimmed, lowercased); "" when the ingredient has no unit */
  unit: string;
  quantityRaw?: string;
  /** parsed and servings-scaled; null when the raw quantity isn't a plain number/fraction */
  quantityNumber: number | null;
  note?: string;
}

export function buildShoppingList(entries: { recipe: Recipe; factor: number }[]): ShoppingListLine[] {
  const items: ScaledItem[] = [];
  for (const { recipe, factor } of entries) {
    for (const ingredient of recipe.ingredients) {
      if (!ingredient.name.trim()) continue;
      const parsed = ingredient.quantity ? parseQuantityToNumber(ingredient.quantity) : null;
      items.push({
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        name: ingredient.name.trim(),
        unit: (ingredient.unit ?? "").trim().toLowerCase(),
        quantityRaw: ingredient.quantity,
        quantityNumber: parsed !== null ? parsed * factor : null,
        note: ingredient.note?.trim() || undefined,
      });
    }
  }

  const groups = new Map<string, ScaledItem[]>();
  for (const item of items) {
    const key = item.name.toLowerCase();
    const list = groups.get(key);
    if (list) list.push(item);
    else groups.set(key, [item]);
  }

  const lines: ShoppingListLine[] = [];
  for (const groupItems of groups.values()) {
    const name = groupItems[0].name;

    const fromRecipesMap = new Map<string, string>();
    for (const item of groupItems) fromRecipesMap.set(item.recipeId, item.recipeTitle);
    const fromRecipes = [...fromRecipesMap.entries()].map(([recipeId, recipeTitle]) => ({
      recipeId,
      recipeTitle,
    }));

    const notes = [...new Set(groupItems.map((i) => i.note).filter((n): n is string => !!n))];

    // Same-unit numeric quantities sum directly; anything non-numeric is
    // kept as its own literal amount.
    const byUnit = new Map<string, number>();
    const literalAmounts: string[] = [];
    for (const item of groupItems) {
      if (item.quantityNumber === null) {
        const literal = [item.quantityRaw, item.unit].filter(Boolean).join(" ").trim();
        if (literal) literalAmounts.push(literal);
        continue;
      }
      byUnit.set(item.unit, (byUnit.get(item.unit) ?? 0) + item.quantityNumber);
    }

    // Cross-unit amounts merge into one gram total when every one of them
    // is convertible via the density table; the rest stay separate.
    const gramConvertible: number[] = [];
    const nonConvertibleAmounts: string[] = [];
    for (const [unit, total] of byUnit) {
      const grams = unit ? convertToGrams(total, unit, name) : null;
      if (grams !== null) gramConvertible.push(grams);
      else nonConvertibleAmounts.push(`${formatNumberAsQuantity(total)}${unit ? ` ${unit}` : ""}`);
    }

    const amounts: string[] = [];
    if (gramConvertible.length > 0) {
      amounts.push(formatGrams(gramConvertible.reduce((sum, g) => sum + g, 0)));
    }
    amounts.push(...nonConvertibleAmounts, ...literalAmounts);

    lines.push({ key: name.toLowerCase(), name, amounts, notes, fromRecipes });
  }

  return lines.sort((a, b) => a.name.localeCompare(b.name));
}
