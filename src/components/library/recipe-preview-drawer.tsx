"use client";

import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { RecipeDetailPanel } from "./recipe-detail-panel";
import { RecipeFormDrawer } from "./recipe-form-drawer";
import { useLibraryShell } from "./library-shell-context";

export function RecipePreviewDrawer() {
  const { selected, displayedRecipe, setSelected, recipeCardActions, formDrawer, closeRecipeForm, handleRecipeSaved } =
    useLibraryShell();
  // Only edits triggered from an open preview render the nested
  // RecipeFormDrawer below (mirrored by AppShell's `editingFromPreview`,
  // which then skips opening its own top-level instance) — rendering it
  // here, nested inside this drawer's own JSX, is what lets Base UI
  // recognize it as a nested drawer and apply the stacked/peek visual.
  // Editing straight from a recipe card's context menu still uses that
  // plain top-level instance instead.
  const editingHere = !!selected && formDrawer?.mode === "edit";

  return (
    <Drawer
      open={!!selected}
      onOpenChange={(open, eventDetails) => {
        if (open) return;
        // Non-modal drawers close on outside press/focus-out by default,
        // which would otherwise fire when the edit drawer (or the rate/
        // delete dialogs) opens on top of this one — their content is
        // "outside" this drawer's own DOM. Ignore the dismissal when the
        // interaction lands inside another overlay instead of the page
        // behind it, so a real outside click still closes the preview.
        const reason = eventDetails.reason;
        const relevantTarget =
          reason === "focus-out"
            ? (eventDetails.event as FocusEvent).relatedTarget
            : (eventDetails.event as Event).target;
        if (
          relevantTarget instanceof Element &&
          relevantTarget.closest('[role="dialog"], [role="alertdialog"]')
        ) {
          eventDetails.cancel();
          return;
        }
        setSelected(null);
      }}
      modal={false}
      swipeDirection="right"
    >
      <DrawerContent className="my-3 border-t border-b data-[swipe-axis=x]:sm:[--drawer-content-width:min(32rem,92vw)]!">
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
        {editingHere && (
          <RecipeFormDrawer
            mode="edit"
            recipe={formDrawer.recipe}
            open
            onOpenChange={(open) => {
              if (!open) closeRecipeForm();
            }}
            onSaved={handleRecipeSaved}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}
