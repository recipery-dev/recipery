"use client";

import * as React from "react";
import { EMPTY_RECIPE_FILTERS, type RecipeFilters } from "@/lib/recipes/filter";

/** Per-viewer filter choice for a recipe grid, persisted in localStorage under `storageKey`. */
export function useRecipeFilters(storageKey: string): [RecipeFilters, (next: RecipeFilters) => void] {
  const [filters, setFilters] = React.useState<RecipeFilters>(EMPTY_RECIPE_FILTERS);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setFilters(JSON.parse(stored) as RecipeFilters);
    } catch {
      // localStorage unavailable, or stored value malformed — just keep the default
    }
  }, [storageKey]);

  const changeFilters = React.useCallback(
    (next: RecipeFilters) => {
      setFilters(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // localStorage unavailable — filter choice just won't persist
      }
    },
    [storageKey]
  );

  return [filters, changeFilters];
}
