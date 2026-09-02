"use client";

import * as React from "react";
import { SideDrawer } from "@/components/side-drawer";
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
    <SideDrawer
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
    >
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
    </SideDrawer>
  );
}
