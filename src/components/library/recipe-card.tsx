"use client";

import * as React from "react";
import { Check, FolderPlus, ShoppingCart, Trash2 } from "lucide-react";
import { RecipeTile, recipeTileClassName } from "./recipe-tile";
import { RateDialog } from "./rate-dialog";
import { getRecipeMenuActions } from "./recipe-menu-actions";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { RECIPE_DRAG_MIME } from "@/lib/dnd";
import { useLibraryShell } from "./library-shell-context";
import type { Recipe, RecipeRecord } from "@/lib/recipes/types";
import type { Collection } from "@/lib/collections";

export interface RecipeCardActions {
  collections: Collection[];
  onToggleCollection: (collectionId: string, recipeId: string) => void;
  onUpdateRecipe: (recipeId: string, patch: { rating?: number; favorite?: boolean; cooked?: boolean }) => void;
  onDeleteRecipe: (recipeId: string) => void;
  onEditRecipe: (recipe: RecipeRecord) => void;
}

interface RecipeCardProps {
  recipe: Recipe;
  selected?: boolean;
  onSelect: (recipe: Recipe) => void;
  actions: RecipeCardActions;
}

export function RecipeCard({ recipe, selected, onSelect, actions }: RecipeCardProps) {
  const { collections, onToggleCollection, onUpdateRecipe, onDeleteRecipe, onEditRecipe } = actions;
  const [rateDialogOpen, setRateDialogOpen] = React.useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false);
  const { activeProfile, shoppingList, addRecipeToShoppingList, removeRecipeFromShoppingList } =
    useLibraryShell();
  const isAdmin = activeProfile.role === "admin";

  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
          <div
            role="button"
            tabIndex={0}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(RECIPE_DRAG_MIME, recipe.id);
              e.dataTransfer.effectAllowed = "copy";
              // The card's own DOM node, as-rendered, so the drag ghost shows
              // the whole card (photo + title) instead of whatever partial
              // snapshot the browser would otherwise guess at.
              e.dataTransfer.setDragImage(e.currentTarget, 20, 20);
            }}
            onClick={() => onSelect(recipe)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(recipe);
              }
            }}
            className={recipeTileClassName(selected)}
          />
        }
      >
        <RecipeTile
          title={recipe.title}
          subtitle={recipe.source}
          coverUrl={recipe.coverUrl}
          badge={
            recipe.cooked && (
              <span
                title="Cooked"
                className="absolute bottom-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-foreground text-background shadow-sm"
              >
                <Check className="size-3" strokeWidth={3} />
              </span>
            )
          }
        />
      </ContextMenuTrigger>

      <ContextMenuContent className="w-56">
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <FolderPlus className="size-3.5" />
            Add to collection
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            {collections.length === 0 ? (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">
                No collections yet — create one from the sidebar.
              </p>
            ) : (
              collections.map((collection) => (
                <ContextMenuCheckboxItem
                  key={collection.id}
                  checked={collection.recipeIds.includes(recipe.id)}
                  onCheckedChange={() => onToggleCollection(collection.id, recipe.id)}
                >
                  <span className={cn("mr-1 size-2 rounded-full", collection.color)} />
                  {collection.name}
                </ContextMenuCheckboxItem>
              ))
            )}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuCheckboxItem
          checked={shoppingList.recipeIds.includes(recipe.id)}
          onCheckedChange={(checked) =>
            checked ? addRecipeToShoppingList(recipe.id) : removeRecipeFromShoppingList(recipe.id)
          }
        >
          <ShoppingCart className="size-3.5" />
          Add to shopping list
        </ContextMenuCheckboxItem>
        <ContextMenuSeparator />
        {getRecipeMenuActions({
          recipe,
          onUpdateRecipe,
          onEditRecipe,
          onRate: () => setRateDialogOpen(true),
        }).map((action) => (
          <ContextMenuItem key={action.key} onClick={action.onClick}>
            <action.icon className="size-3.5" />
            {action.label}
          </ContextMenuItem>
        ))}
        {isAdmin && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem variant="destructive" onClick={() => setConfirmDeleteOpen(true)}>
              <Trash2 className="size-3.5" />
              Delete
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>

      <RateDialog
        recipe={recipe}
        open={rateDialogOpen}
        onOpenChange={setRateDialogOpen}
        onRate={(rating) => onUpdateRecipe(recipe.id, { rating })}
      />
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{recipe.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the recipe and its photos. This can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setConfirmDeleteOpen(false);
                onDeleteRecipe(recipe.id);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ContextMenu>
  );
}
