"use client";

import * as React from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { RecipeDetailPanel } from "./recipe-detail-panel";
import { RecipeFormDrawer } from "./recipe-form-drawer";
import { useLibraryShell } from "./library-shell-context";
import type { RecipeRecord } from "@/lib/recipes/types";

export function RecipePreviewDrawer() {
  const { selected, displayedRecipe, setSelected, recipeCardActions, formDrawer, closeRecipeForm, handleRecipeSaved } =
    useLibraryShell();
  // Only edits triggered from an open preview open the nested
  // RecipeFormDrawer below (mirrored by AppShell's `editingFromPreview`,
  // which then skips opening its own top-level instance) — rendering it
  // here, nested inside this drawer's own JSX, is what lets Base UI
  // recognize it as a nested drawer and apply the stacked/peek visual.
  // Editing straight from a recipe card's context menu still uses that
  // plain top-level instance instead.
  //
  // RecipeFormDrawer stays mounted permanently (only its `open` prop
  // toggles) rather than being added/removed from the tree — mounting a
  // fresh Drawer instance right as the open transition starts was what
  // made the nested drawer glitch on open (unmounting on close was fine
  // since it happened after the exit animation already finished). Its
  // `recipe` prop is kept "sticky" the same way `displayedRecipe` above
  // keeps content visible while the outer drawer's own close animation
  // plays — `formDrawer` clears to null immediately on close.
  const editingHere = !!selected && formDrawer?.mode === "edit";
  const [displayedEditRecipe, setDisplayedEditRecipe] = React.useState<RecipeRecord | undefined>(undefined);
  React.useEffect(() => {
    if (formDrawer?.mode === "edit") setDisplayedEditRecipe(formDrawer.recipe);
  }, [formDrawer]);

  return (
    <Drawer
      open={!!selected}
      onOpenChange={(open, eventDetails) => {
        // For closing (open = false), only block outside-dismissal when another
        // overlay appears. Always allow swipe gestures to close normally.
        if (open) return;

        const reason = eventDetails.reason;
        // Only cancel outside dismissal if clicking on a nested dialog (edit drawer).
        // Otherwise let the default behavior apply (swipe, tap, etc. all work).
        if (reason === "focus-out") {
          const relevantTarget = (eventDetails.event as FocusEvent).relatedTarget;
          if (relevantTarget?.closest('[role="dialog"], [role="alertdialog"]')) {
            eventDetails.cancel();
            return;
          }
        }

        setSelected(null);
      }}
      modal={false}
      swipeDirection="right"
    >
      <DrawerContent className="my-3 border-t border-b data-[swipe-axis=x]:[--drawer-content-width:94vw]! data-[swipe-axis=x]:sm:[--drawer-content-width:min(36rem,92vw)]!">
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
        <RecipeFormDrawer
          mode="edit"
          recipe={displayedEditRecipe}
          open={editingHere}
          onOpenChange={(open) => {
            if (!open) closeRecipeForm();
          }}
          onSaved={handleRecipeSaved}
        />
      </DrawerContent>
    </Drawer>
  );
}
