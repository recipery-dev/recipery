"use client";

import { Heart } from "lucide-react";
import { RecipeGrid } from "@/components/library/recipe-grid";
import { LibrarySortMenu } from "@/components/library/library-sort-menu";
import { useLibraryShell } from "@/components/library/library-shell-context";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useRecipeSort } from "@/hooks/use-recipe-sort";
import { sortRecipes } from "@/lib/recipes/sort";

export default function FavoritesPage() {
  useDocumentTitle("Favorites");
  const { recipes, selected, setSelected, recipeCardActions } = useLibraryShell();
  const [sort, changeSort] = useRecipeSort("recipery:favorites-sort", "recently-cooked");

  const favorites = recipes.filter((recipe) => recipe.favorite);

  return (
    <RecipeGrid
      title="Favorites"
      recipes={sortRecipes(favorites, sort)}
      selectedId={selected?.id}
      onSelect={setSelected}
      actions={recipeCardActions}
      emptyIcon={Heart}
      emptyTitle="No favorites yet"
      emptyMessage="Open a recipe from your library and add it to favorites to see it here."
      titleActions={favorites.length > 0 ? <LibrarySortMenu value={sort} onChange={changeSort} /> : null}
    />
  );
}
