"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { FolderOpen } from "lucide-react";
import { RecipeGrid } from "@/components/library/recipe-grid";
import { useLibraryShell } from "@/components/library/library-shell-context";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function CollectionPage() {
  const params = useParams<{ id: string }>();
  const { recipes, collections, selected, setSelected, recipeCardActions } = useLibraryShell();
  const collection = collections.find((c) => c.id === params.id);
  const collectionRecipes = collection
    ? recipes.filter((recipe) => collection.recipeIds.includes(recipe.id))
    : [];
  useDocumentTitle(collection?.name ?? "Collection");

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
      recipes={collectionRecipes}
      selectedId={selected?.id}
      onSelect={setSelected}
      actions={recipeCardActions}
      emptyIcon={FolderOpen}
      emptyTitle="This collection is empty"
      emptyMessage="Select a recipe and use “Add to collection” to add it here."
    />
  );
}
