"use client";

import { ChefHat } from "lucide-react";
import { RecentlyCooked } from "@/components/library/recently-cooked";
import { RecipeGrid } from "@/components/library/recipe-grid";
import { LibrarySortMenu } from "@/components/library/library-sort-menu";
import { useLibraryShell } from "@/components/library/library-shell-context";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useRecipeSort } from "@/hooks/use-recipe-sort";
import { DEMO_MODE } from "@/lib/demo-mode";
import { sortRecipes } from "@/lib/recipes/sort";

export function LibraryPage() {
  useDocumentTitle("Library");
  const { recipes, selected, setSelected, recipeCardActions } = useLibraryShell();
  const [sort, changeSort] = useRecipeSort("recipery:library-sort", "recent");

  const recentlyCooked = recipes
    .filter((recipe) => recipe.lastCookedAt !== undefined)
    .sort((a, b) => (b.lastCookedAt ?? "").localeCompare(a.lastCookedAt ?? ""));
  const recentlyCookedRecipe = recentlyCooked[0];

  return (
    <div className="flex flex-col gap-8">
      {recentlyCookedRecipe && (
        <RecentlyCooked recipe={recentlyCookedRecipe} onSelect={setSelected} />
      )}
      <RecipeGrid
        title="Your Library"
        recipes={sortRecipes(recipes, sort)}
        selectedId={selected?.id}
        onSelect={setSelected}
        actions={recipeCardActions}
        emptyIcon={ChefHat}
        emptyTitle="Your library is empty"
        emptyMessage={
          DEMO_MODE
            ? "This demo only shows what's already in the bucket — adding recipes is disabled."
            : "Use the + button in the top-right corner to import a recipe from a URL or enter one manually."
        }
        titleActions={recipes.length > 0 ? <LibrarySortMenu value={sort} onChange={changeSort} /> : null}
      />
    </div>
  );
}
