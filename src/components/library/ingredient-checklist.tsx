"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { parseQuantityToNumber, scaleQuantity } from "@/lib/recipes/scale";
import { convertToGrams, formatGrams } from "@/lib/recipes/convert";
import type { RecipeIngredient } from "@/lib/recipes/types";

interface IngredientChecklistProps {
  ingredients: RecipeIngredient[];
  factor: number;
  checked: Set<string>;
  onToggle: (id: string) => void;
  showGramHints: boolean;
  className?: string;
}

/**
 * The scaled, checkable, gram-hinted ingredient list — shared by the recipe
 * detail panel and Cook Mode so both render it identically.
 */
export function IngredientChecklist({
  ingredients,
  factor,
  checked,
  onToggle,
  showGramHints,
  className,
}: IngredientChecklistProps) {
  return (
    <ul className={cn("flex flex-col gap-2", className)}>
      {ingredients.map((ingredient) => {
        const isChecked = checked.has(ingredient.id);
        const quantity = scaleQuantity(ingredient.quantity, factor);
        const gramHint = (() => {
          if (!showGramHints) return null;
          if (!ingredient.unit || ingredient.unit.trim().toLowerCase() === "g") return null;
          const numericQty = ingredient.quantity ? parseQuantityToNumber(ingredient.quantity) : null;
          if (numericQty === null) return null;
          const grams = convertToGrams(numericQty * factor, ingredient.unit, ingredient.name);
          return grams === null ? null : formatGrams(grams);
        })();
        return (
          <li key={ingredient.id}>
            <label className="flex cursor-pointer items-start gap-2.5 text-sm">
              <Checkbox checked={isChecked} onCheckedChange={() => onToggle(ingredient.id)} className="no-print mt-0.5" />
              <span className={cn(isChecked && "text-muted-foreground line-through")}>
                {quantity && <span className="font-medium">{quantity} </span>}
                {ingredient.unit && <span className="font-medium">{ingredient.unit} </span>}
                {ingredient.name}
                {ingredient.note && <span className="text-muted-foreground"> ({ingredient.note})</span>}
                {gramHint && <span className="text-muted-foreground"> ({gramHint})</span>}
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
