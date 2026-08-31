"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { FolderOpen, SearchX, ShoppingCart } from "lucide-react";
import { RecipeGrid } from "@/components/library/recipe-grid";
import { LibrarySortMenu } from "@/components/library/library-sort-menu";
import { LibraryFilterMenu } from "@/components/library/library-filter-menu";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useLibraryShell } from "@/components/library/library-shell-context";
import { useRecipeSort } from "@/hooks/use-recipe-sort";
import { useRecipeFilters } from "@/hooks/use-recipe-filters";
import { sortRecipes } from "@/lib/recipes/sort";
import { filterRecipes, isFiltersEmpty } from "@/lib/recipes/filter";

export function CollectionPage() {
  const params = useParams<{ id: string }>();
  const {
    recipes,
    collections,
    smartCollections,
    selected,
    setSelected,
    recipeCardActions,
    addRecipeToShoppingList,
  } = useLibraryShell();
  const [sort, changeSort] = useRecipeSort(
    "recipery:collection-sort",
    "recent",
  );
  const [filters, changeFilters] = useRecipeFilters(
    "recipery:collection-filters",
  );
  const collection =
    collections.find((c) => c.id === params.id) ??
    smartCollections.find((c) => c.id === params.id);
  const collectionRecipes = collection
    ? recipes.filter((recipe) => collection.recipeIds.includes(recipe.id))
    : [];
  const filteredRecipes = filterRecipes(collectionRecipes, filters);
  const filterActive = !isFiltersEmpty(filters);

  const addAllToShoppingList = () => {
    for (const recipe of collectionRecipes) addRecipeToShoppingList(recipe.id);
    toast.add({
      title: "Added to shopping list",
      description: `Every recipe in ${collection?.name ?? "this collection"} was added.`,
      type: "success",
    });
  };

  // matches the old view-switch behavior of auto-opening the first recipe in
  // the collection when you land here with nothing selected yet
  React.useEffect(() => {
    if (collection && collectionRecipes.length > 0 && !selected) {
      setSelected(collectionRecipes[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection?.id]);

  return (
    <RecipeGrid
      title={collection?.name ?? "Collection"}
      recipes={sortRecipes(filteredRecipes, sort)}
      selectedId={selected?.id}
      onSelect={setSelected}
      actions={recipeCardActions}
      emptyIcon={filterActive ? SearchX : FolderOpen}
      emptyTitle={
        filterActive
          ? "No recipes match your filters"
          : "This collection is empty"
      }
      emptyMessage={
        filterActive
          ? "Try clearing or changing your filters."
          : "Select a recipe and use “Add to collection” to add it here."
      }
      titleActions={
        collectionRecipes.length > 0 ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5"
              onClick={addAllToShoppingList}
            >
              <ShoppingCart className="size-3.5" />
              <span className="hidden sm:inline">Add all to shopping list</span>
            </Button>
            <LibraryFilterMenu
              recipes={collectionRecipes}
              value={filters}
              onChange={changeFilters}
            />
            <LibrarySortMenu value={sort} onChange={changeSort} />
          </div>
        ) : null
      }
    />
  );
}
