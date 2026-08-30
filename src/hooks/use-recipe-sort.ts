"use client";

import * as React from "react";
import type { RecipeSort } from "@/lib/recipes/sort";

/** Per-viewer sort choice for a recipe grid, persisted in localStorage under `storageKey`. */
export function useRecipeSort(
  storageKey: string,
  defaultSort: RecipeSort
): [RecipeSort, (next: RecipeSort) => void] {
  const [sort, setSort] = React.useState<RecipeSort>(defaultSort);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setSort(stored as RecipeSort);
    } catch {
      // localStorage unavailable (e.g. private browsing) — just keep the default
    }
  }, [storageKey]);

  const changeSort = React.useCallback(
    (next: RecipeSort) => {
      setSort(next);
      try {
        localStorage.setItem(storageKey, next);
      } catch {
        // localStorage unavailable — sort choice just won't persist
      }
    },
    [storageKey]
  );

  return [sort, changeSort];
}
