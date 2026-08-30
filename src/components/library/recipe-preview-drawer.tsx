"use client";

import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { RecipeDetailPanel } from "./recipe-detail-panel";
import { useLibraryShell } from "./library-shell-context";

export function RecipePreviewDrawer() {
  const { selected, displayedRecipe, setSelected, recipeCardActions } = useLibraryShell();

  return (
    <Drawer
      open={!!selected}
      onOpenChange={(open) => {
        if (!open) setSelected(null);
      }}
      modal={false}
      swipeDirection="right"
      // Non-modal drawers close on outside press/focus-out by default, which
      // fires when the edit drawer opens on top of this one (its content is
      // "outside" this drawer's own DOM) — losing the preview the moment you
      // save an edit. The X button and Escape remain as explicit closes.
      disablePointerDismissal
    >
      <DrawerContent className="my-3 border-t border-b data-[swipe-axis=x]:sm:[--drawer-content-width:min(30rem,92vw)]!">
        {displayedRecipe && (
          <RecipeDetailPanel
            recipe={displayedRecipe}
            collections={recipeCardActions.collections}
            onToggleCollection={recipeCardActions.onToggleCollection}
            onUpdateRecipe={recipeCardActions.onUpdateRecipe}
            onDeleteRecipe={recipeCardActions.onDeleteRecipe}
            onEditRecipe={recipeCardActions.onEditRecipe}
            onClose={() => setSelected(null)}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}
