"use client";

import { ChefHat, SearchX } from "lucide-react";
import { RecentlyCooked } from "@/components/library/recently-cooked";
import { RecipeGrid } from "@/components/library/recipe-grid";
import { LibrarySortMenu } from "@/components/library/library-sort-menu";
import { LibraryFilterMenu } from "@/components/library/library-filter-menu";
import { useLibraryShell } from "@/components/library/library-shell-context";
import { useRecipeSort } from "@/hooks/use-recipe-sort";
import { useRecipeFilters } from "@/hooks/use-recipe-filters";
import { DEMO_MODE } from "@/lib/demo-mode";
import { sortRecipes } from "@/lib/recipes/sort";
import { filterRecipes, isFiltersEmpty } from "@/lib/recipes/filter";

// The title comes from app/(app)/page.tsx's own `metadata` export (an
// absolute override, not the shared "%s - Recipery" template every other
// route uses) — nothing to set here.
export function LibraryPage() {
  const { recipes, selected, setSelected, recipeCardActions } = useLibraryShell();
  const [sort, changeSort] = useRecipeSort("recipery:library-sort", "recent");
  const [filters, changeFilters] = useRecipeFilters("recipery:library-filters");

  const recentlyCooked = recipes
    .filter((recipe) => recipe.lastCookedAt !== undefined)
    .sort((a, b) => (b.lastCookedAt ?? "").localeCompare(a.lastCookedAt ?? ""));
  const recentlyCookedRecipe = recentlyCooked[0];

  const filteredRecipes = filterRecipes(recipes, filters);
  const filterActive = !isFiltersEmpty(filters);

  return (
    <div className="flex flex-col gap-8">
      {recentlyCookedRecipe && (
        <RecentlyCooked recipe={recentlyCookedRecipe} onSelect={setSelected} />
      )}
      <RecipeGrid
        title="Your Library"
        recipes={sortRecipes(filteredRecipes, sort)}
        selectedId={selected?.id}
        onSelect={setSelected}
        actions={recipeCardActions}
        emptyIcon={filterActive ? SearchX : ChefHat}
        emptyTitle={filterActive ? "No recipes match your filters" : "Your library is empty"}
        emptyMessage={
          filterActive
            ? "Try clearing or changing your filters."
            : DEMO_MODE
              ? "This demo only shows what's already in the bucket — adding recipes is disabled."
              : "Use the + button in the top-right corner to import a recipe from a URL or enter one manually."
        }
        titleActions={
          recipes.length > 0 ? (
            <div className="flex items-center gap-2">
              <LibraryFilterMenu recipes={recipes} value={filters} onChange={changeFilters} />
              <LibrarySortMenu value={sort} onChange={changeSort} />
            </div>
          ) : null
        }
      />
    </div>
  );
}
