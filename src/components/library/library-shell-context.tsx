"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "@/components/ui/toast";
import { useCollections } from "@/hooks/use-collections";
import { recipeCoverUrl, toLibraryRecipe, type Recipe, type RecipeRecord } from "@/lib/recipes/types";
import type { Collection } from "@/lib/collections";
import type { PublicProfile } from "@/lib/profiles/types";
import type { PublicAppSettings } from "@/lib/settings/types";
import type { RecipeCardActions } from "./recipe-card";

interface LibraryShellContextValue {
  recipes: Recipe[];
  selected: Recipe | null;
  setSelected: (recipe: Recipe | null) => void;
  displayedRecipe: Recipe | null;
  collections: Collection[];
  createCollection: (name: string, color: string) => void;
  renameCollection: (id: string, name: string) => void;
  recolorCollection: (id: string, color: string) => void;
  deleteCollection: (id: string) => void;
  addRecipeToCollection: (collectionId: string, recipeId: string) => void;
  recipeCardActions: RecipeCardActions;
  profiles: PublicProfile[];
  activeProfileId: string;
  activeProfile: PublicProfile;
  settings: PublicAppSettings;
  importing: boolean;
  importFromUrl: (url: string) => Promise<void>;
  formDrawer: { mode: "create" | "edit"; recipe?: RecipeRecord } | null;
  openCreateRecipe: () => void;
  openEditRecipe: (recipe: RecipeRecord) => void;
  closeRecipeForm: () => void;
  handleRecipeSaved: (record: RecipeRecord) => void;
}

const LibraryShellContext = React.createContext<LibraryShellContextValue | null>(null);

export function useLibraryShell(): LibraryShellContextValue {
  const ctx = React.useContext(LibraryShellContext);
  if (!ctx) throw new Error("useLibraryShell must be used within LibraryShellProvider");
  return ctx;
}

interface LibraryShellProviderProps {
  initialRecipes: Recipe[];
  profiles: PublicProfile[];
  activeProfileId: string;
  settings: PublicAppSettings;
  children: React.ReactNode;
}

export function LibraryShellProvider({
  initialRecipes,
  profiles,
  activeProfileId,
  settings,
  children,
}: LibraryShellProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [recipes, setRecipes] = React.useState<Recipe[]>(initialRecipes);

  // The drawer's open/closed state (and which recipe it shows) lives on the
  // URL — ?recipe=<id> — rather than in local state, so it's shareable,
  // survives a refresh, and the browser back button closes it.
  const selectedId = searchParams.get("recipe");
  const selected = recipes.find((r) => r.id === selectedId) ?? null;

  // Kept around during the close transition so the panel doesn't blank out
  // while it's sliding off-screen.
  const [displayedRecipe, setDisplayedRecipe] = React.useState<Recipe | null>(null);
  React.useEffect(() => {
    if (selected) setDisplayedRecipe(selected);
  }, [selected]);

  const {
    collections,
    createCollection,
    renameCollection,
    recolorCollection,
    deleteCollection,
    toggleRecipeInCollection,
    addRecipeToCollection,
  } = useCollections(activeProfileId);

  const setRecipeParam = React.useCallback(
    (id: string | null, opts?: { replace?: boolean }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set("recipe", id);
      else params.delete("recipe");
      const query = params.toString();
      const url = query ? `${pathname}?${query}` : pathname;
      if (opts?.replace) router.replace(url, { scroll: false });
      else router.push(url, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // Opening pushes a new history entry (so the back button closes the
  // drawer); closing replaces instead of stacking a redundant "closed" entry.
  const setSelected = React.useCallback(
    (recipe: Recipe | null) => setRecipeParam(recipe?.id ?? null, { replace: recipe === null }),
    [setRecipeParam]
  );

  React.useEffect(() => {
    if (!selected) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selected, setSelected]);

  const [importing, setImporting] = React.useState(false);

  const handleCreated = (record: RecipeRecord) => {
    const recipe = toLibraryRecipe(record);
    setRecipes((prev) => [...prev.filter((r) => r.id !== recipe.id), recipe]);
  };

  const importFromUrl = React.useCallback(
    async (url: string) => {
      setImporting(true);
      try {
        const res = await fetch("/api/recipes/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.add({ title: "Couldn't import that recipe", description: data.error, type: "error" });
          return;
        }
        handleCreated(data.recipe as RecipeRecord);
        toast.add({
          title: "Recipe imported",
          description: `"${data.recipe.title}" was added to your library`,
          type: "success",
        });
        setRecipeParam(data.recipe.id);
      } catch {
        toast.add({ title: "Couldn't import that recipe", type: "error" });
      } finally {
        setImporting(false);
      }
    },
    [setRecipeParam]
  );

  // Merges the record onto the existing Recipe rather than replacing it: a
  // profile-state PATCH response carries the fresh rating/favorite/cooked
  // values and simply overwrites them here. `selected` re-derives from
  // `recipes` automatically, so only `displayedRecipe` needs an explicit nudge.
  const handleRecipeUpdated = (record: RecipeRecord & Partial<Recipe>) => {
    const merge = (prev: Recipe): Recipe => ({ ...prev, ...record, coverUrl: recipeCoverUrl(record) });
    setRecipes((prev) => prev.map((r) => (r.id === record.id ? merge(r) : r)));
    setDisplayedRecipe((prev) => (prev && prev.id === record.id ? merge(prev) : prev));
  };

  const handleUpdateRecipe = async (
    recipeId: string,
    patch: { rating?: number; favorite?: boolean; cooked?: boolean }
  ) => {
    const res = await fetch(`/api/recipes/${recipeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) return;
    const data = await res.json();
    handleRecipeUpdated(data.recipe as RecipeRecord);
  };

  const handleDeleteRecipe = async (recipeId: string) => {
    const title = recipes.find((r) => r.id === recipeId)?.title;
    const res = await fetch(`/api/recipes/${recipeId}`, { method: "DELETE" });
    if (!res.ok) {
      toast.add({ title: "Failed to delete recipe", type: "error" });
      return;
    }
    setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
    if (selectedId === recipeId) setRecipeParam(null, { replace: true });
    toast.add({
      title: "Recipe deleted",
      description: title ? `"${title}" was removed from your library` : undefined,
      type: "success",
    });
  };

  const [formDrawer, setFormDrawer] = React.useState<{ mode: "create" | "edit"; recipe?: RecipeRecord } | null>(
    null
  );
  const openCreateRecipe = React.useCallback(() => setFormDrawer({ mode: "create" }), []);
  const openEditRecipe = React.useCallback(
    (recipe: RecipeRecord) => setFormDrawer({ mode: "edit", recipe }),
    []
  );
  const closeRecipeForm = React.useCallback(() => setFormDrawer(null), []);

  const handleRecipeSaved = (record: RecipeRecord) => {
    if (formDrawer?.mode === "create") {
      handleCreated(record);
      setRecipeParam(record.id);
    } else {
      handleRecipeUpdated(record);
    }
  };

  const recipeCardActions: RecipeCardActions = {
    collections,
    onToggleCollection: toggleRecipeInCollection,
    onUpdateRecipe: handleUpdateRecipe,
    onDeleteRecipe: handleDeleteRecipe,
    onEditRecipe: openEditRecipe,
  };

  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0];

  const value: LibraryShellContextValue = {
    recipes,
    selected,
    setSelected,
    displayedRecipe,
    collections,
    createCollection,
    renameCollection,
    recolorCollection,
    deleteCollection,
    addRecipeToCollection,
    recipeCardActions,
    profiles,
    activeProfileId,
    activeProfile,
    settings,
    importing,
    importFromUrl,
    formDrawer,
    openCreateRecipe,
    openEditRecipe,
    closeRecipeForm,
    handleRecipeSaved,
  };

  return <LibraryShellContext.Provider value={value}>{children}</LibraryShellContext.Provider>;
}
