"use client";

import * as React from "react";
import { AppSidebar } from "./app-sidebar";
import { AppHeader } from "./app-header";
import { RecipePreviewDrawer } from "./recipe-preview-drawer";
import { RecipeFormDrawer } from "./recipe-form-drawer";
import { CookMode } from "./cook-mode";
import { useLibraryShell } from "./library-shell-context";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export function AppShell({
  children,
  defaultSidebarOpen,
}: {
  children: React.ReactNode;
  defaultSidebarOpen: boolean;
}) {
  const { formDrawer, closeRecipeForm, handleRecipeSaved, selected, displayedRecipe, cookMode, setCookMode } =
    useLibraryShell();
  // Editing from an open preview renders its own nested RecipeFormDrawer
  // (see RecipePreviewDrawer) so it stacks on top of the preview instead of
  // this top-level instance, which only handles create and edit-without-a-
  // preview (e.g. from a recipe card's context menu).
  const editingFromPreview = !!selected && formDrawer?.mode === "edit";

  return (
    <SidebarProvider defaultOpen={defaultSidebarOpen}>
      <AppSidebar />

      <SidebarInset className="h-dvh overflow-hidden">
        <AppHeader />

        <div className="flex flex-1 overflow-hidden md:pb-8 md:pl-8">
          <div className="flex-1 overflow-y-auto px-4 pt-10 md:px-0">
            <div className="flex flex-col gap-8 md:pr-8">{children}</div>
          </div>
        </div>
      </SidebarInset>

      <RecipePreviewDrawer />
      <RecipeFormDrawer
        mode={formDrawer?.mode ?? "create"}
        recipe={formDrawer?.recipe}
        open={!!formDrawer && !editingFromPreview}
        onOpenChange={(open) => {
          if (!open) closeRecipeForm();
        }}
        onSaved={handleRecipeSaved}
      />
      <CookMode recipe={displayedRecipe} open={cookMode} onClose={() => setCookMode(false)} />
    </SidebarProvider>
  );
}
