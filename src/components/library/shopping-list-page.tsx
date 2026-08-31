"use client";

import * as React from "react";
import { Minus, Plus, Printer, ShoppingCart, Trash2, X } from "lucide-react";
import { RecipePhoto } from "./recipe-photo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useLibraryShell } from "./library-shell-context";
import { buildShoppingList, type ShoppingListLine } from "@/lib/recipes/shopping";
import { AISLE_ORDER, type Aisle } from "@/lib/recipes/aisle";
import { cn } from "@/lib/utils";
import type { Recipe } from "@/lib/recipes/types";

export function ShoppingListPage() {
  const { recipes, shoppingList, removeRecipeFromShoppingList, clearShoppingList, toggleShoppingListChecked } =
    useLibraryShell();

  // How many servings each added recipe should be scaled to for this trip —
  // client-only and not persisted, since it only matters while assembling
  // the current list, not across sessions.
  const [servingsByRecipe, setServingsByRecipe] = React.useState<Record<string, number>>({});

  const addedRecipes = shoppingList.recipeIds
    .map((id) => recipes.find((r) => r.id === id))
    .filter((r): r is Recipe => !!r);

  const servingsFor = (recipe: Recipe) => servingsByRecipe[recipe.id] ?? recipe.servings ?? 0;
  const setServingsFor = (recipe: Recipe, next: number) =>
    setServingsByRecipe((prev) => ({ ...prev, [recipe.id]: Math.max(1, next) }));
  const factorFor = (recipe: Recipe) => {
    const servings = servingsFor(recipe);
    return recipe.servings && servings ? servings / recipe.servings : 1;
  };

  const lines = buildShoppingList(addedRecipes.map((recipe) => ({ recipe, factor: factorFor(recipe) })));

  // Grouped into aisles for the store-order display below — buildShoppingList
  // already returns lines alphabetized within the whole list, which carries
  // over as alphabetical order within each aisle bucket too.
  const linesByAisle = new Map<Aisle, ShoppingListLine[]>();
  for (const line of lines) {
    const bucket = linesByAisle.get(line.aisle);
    if (bucket) bucket.push(line);
    else linesByAisle.set(line.aisle, [line]);
  }

  if (addedRecipes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <ShoppingCart className="size-5 text-muted-foreground" strokeWidth={1.75} />
        </div>
        <div className="space-y-1 px-6">
          <p className="text-sm font-semibold">Your shopping list is empty</p>
          <p className="mx-auto max-w-xs text-sm text-muted-foreground">
            Add recipes from your library — use “Add to shopping list” from a recipe’s menu.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="no-print flex items-center justify-between gap-3">
        <h2 className="min-w-0 truncate font-heading text-lg font-bold tracking-tight">Shopping List</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.print()}>
            <Printer className="size-3.5" />
            Print
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={clearShoppingList}>
            <Trash2 className="size-3.5" />
            Clear list
          </Button>
        </div>
      </div>

      <div className="no-print flex flex-col gap-2">
        {addedRecipes.map((recipe) => (
          <div
            key={recipe.id}
            className="flex items-center gap-3 rounded-lg border border-border p-2.5"
          >
            <RecipePhoto title={recipe.title} coverUrl={recipe.coverUrl} className="w-12 shrink-0" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{recipe.title}</span>
            {recipe.servings !== undefined && (
              <div className="flex shrink-0 items-center gap-0.5 rounded-full bg-secondary px-1 py-1">
                <button
                  type="button"
                  aria-label="Fewer servings"
                  onClick={() => setServingsFor(recipe, servingsFor(recipe) - 1)}
                  className="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
                >
                  <Minus className="size-3" />
                </button>
                <span className="px-1 text-center text-sm font-medium whitespace-nowrap tabular-nums">
                  {servingsFor(recipe)}
                </span>
                <button
                  type="button"
                  aria-label="More servings"
                  onClick={() => setServingsFor(recipe, servingsFor(recipe) + 1)}
                  className="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
                >
                  <Plus className="size-3" />
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => removeRecipeFromShoppingList(recipe.id)}
              aria-label={`Remove ${recipe.title} from shopping list`}
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-5">
        <h3 className="font-heading text-sm font-bold">Ingredients</h3>
        {AISLE_ORDER.filter((aisle) => linesByAisle.has(aisle)).map((aisle) => (
          <div key={aisle}>
            <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{aisle}</p>
            <ul className="flex flex-col gap-2">
              {linesByAisle.get(aisle)!.map((line) => {
                const isChecked = shoppingList.checkedOff.includes(line.key);
                return (
                  <li key={line.key}>
                    <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleShoppingListChecked(line.key)}
                        className="mt-0.5"
                      />
                      <span className={cn(isChecked && "text-muted-foreground line-through")}>
                        {line.amounts.length > 0 && (
                          <span className="font-medium">{line.amounts.join(" + ")} </span>
                        )}
                        {line.name}
                        {line.notes.length > 0 && (
                          <span className="text-muted-foreground"> ({line.notes.join(", ")})</span>
                        )}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
