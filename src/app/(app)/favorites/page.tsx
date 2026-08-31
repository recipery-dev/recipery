"use client";

import { Heart, SearchX } from "lucide-react";
import { RecipeGrid } from "@/components/library/recipe-grid";
import { LibrarySortMenu } from "@/components/library/library-sort-menu";
import { LibraryFilterMenu } from "@/components/library/library-filter-menu";
import { useLibraryShell } from "@/components/library/library-shell-context";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useRecipeSort } from "@/hooks/use-recipe-sort";
import { useRecipeFilters } from "@/hooks/use-recipe-filters";
import { sortRecipes } from "@/lib/recipes/sort";
import { filterRecipes, isFiltersEmpty } from "@/lib/recipes/filter";

export default function FavoritesPage() {
  useDocumentTitle("Favorites");
  const { recipes, selected, setSelected, recipeCardActions } = useLibraryShell();
  const [sort, changeSort] = useRecipeSort("recipery:favorites-sort", "recently-cooked");
  const [filters, changeFilters] = useRecipeFilters("recipery:favorites-filters");

  const favorites = recipes.filter((recipe) => recipe.favorite);
  const filteredFavorites = filterRecipes(favorites, filters);
  const filterActive = !isFiltersEmpty(filters);

  return (
    <RecipeGrid
      title="Favorites"
      recipes={sortRecipes(filteredFavorites, sort)}
      selectedId={selected?.id}
      onSelect={setSelected}
      actions={recipeCardActions}
      emptyIcon={filterActive ? SearchX : Heart}
      emptyTitle={filterActive ? "No favorites match your filters" : "No favorites yet"}
      emptyMessage={
        filterActive
          ? "Try clearing or changing your filters."
          : "Open a recipe from your library and add it to favorites to see it here."
      }
      titleActions={
        favorites.length > 0 ? (
          <div className="flex items-center gap-2">
            <LibraryFilterMenu recipes={favorites} value={filters} onChange={changeFilters} />
            <LibrarySortMenu value={sort} onChange={changeSort} />
          </div>
        ) : null
      }
    />
  );
}
