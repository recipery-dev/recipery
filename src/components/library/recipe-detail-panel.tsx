"use client";

import * as React from "react";
import {
  ChefHat,
  Clock,
  FolderPlus,
  MoreVertical,
  Heart,
  Printer,
  ShoppingCart,
  Trash2,
  Minus,
  Plus,
  X,
} from "lucide-react";
import { RateDialog } from "./rate-dialog";
import { RecipePhoto } from "./recipe-photo";
import { IngredientChecklist } from "./ingredient-checklist";
import { getRecipeMenuActions } from "./recipe-menu-actions";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { RecipeActivity } from "@/app/api/recipes/[id]/activity/route";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useLibraryShell } from "./library-shell-context";
import {
  recipeStepImageUrl,
  type Recipe,
  type RecipeRecord,
} from "@/lib/recipes/types";
import type { Collection } from "@/lib/collections";

interface RecipeDetailPanelProps {
  recipe: Recipe;
  collections: Collection[];
  onToggleCollection: (collectionId: string, recipeId: string) => void;
  onClose: () => void;
  onUpdateRecipe: (
    recipeId: string,
    patch: { rating?: number; favorite?: boolean; cooked?: boolean },
  ) => void;
  onDeleteRecipe: (recipeId: string) => void;
  onEditRecipe: (recipe: RecipeRecord) => void;
}

export function RecipeDetailPanel({
  recipe,
  collections,
  onToggleCollection,
  onClose,
  onUpdateRecipe,
  onDeleteRecipe,
  onEditRecipe,
}: RecipeDetailPanelProps) {
  const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false);
  const [rateDialogOpen, setRateDialogOpen] = React.useState(false);
  const [checked, setChecked] = React.useState<Set<string>>(new Set());
  const {
    activeProfile,
    settings,
    shoppingList,
    addRecipeToShoppingList,
    removeRecipeFromShoppingList,
    servings,
    setServings,
    setCookMode,
  } = useLibraryShell();
  const isAdmin = activeProfile.role === "admin";

  // A different recipe was opened — reset the checklist rather than
  // carrying over the previous recipe's state. (The servings scaler is
  // shared context state, reset there instead — see library-shell-context.)
  React.useEffect(() => {
    setChecked(new Set());
  }, [recipe.id]);

  const factor = recipe.servings && servings ? servings / recipe.servings : 1;
  const totalMin =
    recipe.prepMinutes !== undefined || recipe.cookMinutes !== undefined
      ? (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0)
      : undefined;

  const [activity, setActivity] = React.useState<RecipeActivity[]>([]);
  React.useEffect(() => {
    let cancelled = false;
    fetch(`/api/recipes/${recipe.id}/activity`)
      .then((res) => res.json())
      .then((data: { activity: RecipeActivity[] }) => {
        if (!cancelled) setActivity(data.activity ?? []);
      })
      .catch(() => {
        if (!cancelled) setActivity([]);
      });
    return () => {
      cancelled = true;
    };
  }, [recipe.id]);

  const toggleChecked = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <aside className="relative flex h-full w-full flex-col overflow-x-hidden">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close details"
        className="no-print absolute top-4 right-4 flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="size-4" />
      </button>

      <div className="shrink-0 px-6 pt-6">
        <div className="flex gap-4 pr-8">
          <RecipePhoto
            title={recipe.title}
            coverUrl={recipe.coverUrl}
            className="w-28"
          />
          <div className="flex min-w-0 flex-col justify-center gap-1.5">
            <h2 className="font-heading text-lg font-bold leading-snug text-balance">
              {recipe.title}
            </h2>
            {recipe.source && (
              <p className="truncate text-sm text-muted-foreground">
                {recipe.source}
              </p>
            )}
            {totalMin !== undefined && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3.5" />
                {recipe.prepMinutes !== undefined &&
                  `${recipe.prepMinutes} min prep`}
                {recipe.prepMinutes !== undefined &&
                  recipe.cookMinutes !== undefined &&
                  " · "}
                {recipe.cookMinutes !== undefined &&
                  `${recipe.cookMinutes} min cook`}
              </span>
            )}
            {(recipe.tags.length > 0 ||
              recipe.difficulty ||
              recipe.cuisine) && (
              <div className="flex flex-wrap gap-1.5">
                {recipe.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
                {recipe.difficulty && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize text-muted-foreground">
                    {recipe.difficulty}
                  </span>
                )}
                {recipe.cuisine && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {recipe.cuisine}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="no-print mt-6 flex items-center gap-2">
          <Button
            variant={recipe.favorite ? "default" : "secondary"}
            className="flex-1 gap-2 rounded-full"
            onClick={() =>
              onUpdateRecipe(recipe.id, { favorite: !recipe.favorite })
            }
          >
            <Heart
              className={cn("size-4", recipe.favorite && "fill-current")}
            />
            {recipe.favorite ? "Favorited" : "Favorite"}
          </Button>

          {recipe.servings !== undefined && (
            <div className="flex shrink-0 items-center gap-0.5 rounded-full bg-secondary px-1 py-1">
              <button
                type="button"
                aria-label="Fewer servings"
                onClick={() => setServings(Math.max(1, servings - 1))}
                className="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
              >
                <Minus className="size-3" />
              </button>
              <span className="px-1 text-center text-sm font-medium whitespace-nowrap tabular-nums">
                {servings} {servings === 1 ? "Serving" : "Servings"}
              </span>
              <button
                type="button"
                aria-label="More servings"
                onClick={() => setServings(servings + 1)}
                className="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
              >
                <Plus className="size-3" />
              </button>
            </div>
          )}

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="secondary"
                  size="icon"
                  className="rounded-full"
                  aria-label="Cook mode"
                  onClick={() => setCookMode(true)}
                >
                  <ChefHat className="size-4" />
                </Button>
              }
            />
            <TooltipContent>Cook mode</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="secondary"
                  size="icon"
                  className="rounded-full"
                  aria-label="More options"
                >
                  <MoreVertical className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <FolderPlus className="size-3.5" />
                  Add to collection
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-48">
                  {collections.length === 0 ? (
                    <p className="px-2 py-1.5 text-xs text-muted-foreground">
                      No collections yet — create one from the sidebar.
                    </p>
                  ) : (
                    collections.map((collection) => (
                      <DropdownMenuCheckboxItem
                        key={collection.id}
                        checked={collection.recipeIds.includes(recipe.id)}
                        onCheckedChange={() =>
                          onToggleCollection(collection.id, recipe.id)
                        }
                      >
                        <span
                          className={cn(
                            "mr-1 size-2 rounded-full",
                            collection.color,
                          )}
                        />
                        {collection.name}
                      </DropdownMenuCheckboxItem>
                    ))
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuCheckboxItem
                checked={shoppingList.recipeIds.includes(recipe.id)}
                onCheckedChange={(checked) =>
                  checked
                    ? addRecipeToShoppingList(recipe.id)
                    : removeRecipeFromShoppingList(recipe.id)
                }
              >
                <ShoppingCart className="size-3.5" />
                Add to shopping list
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              {getRecipeMenuActions({
                recipe,
                onUpdateRecipe,
                onEditRecipe,
                onRate: () => setRateDialogOpen(true),
              })
                // Favorite already has its own button up top — no need for it twice.
                .filter((action) => action.key !== "favorite")
                .map((action) => (
                  <DropdownMenuItem key={action.key} onClick={action.onClick}>
                    <action.icon className="size-3.5" />
                    {action.label}
                  </DropdownMenuItem>
                ))}
              <DropdownMenuItem onClick={() => window.print()}>
                <Printer className="size-3.5" />
                Print
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setConfirmDeleteOpen(true)}
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-6 pt-3 pb-6">
        {recipe.description && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {recipe.description}
          </p>
        )}

        <div className="mt-5 flex flex-col gap-5">
          <div>
            <h3 className="font-heading text-sm font-bold">Ingredients</h3>
            <IngredientChecklist
              ingredients={recipe.ingredients}
              factor={factor}
              checked={checked}
              onToggle={toggleChecked}
              showGramHints={settings.showIngredientGramHints}
              className="mt-2.5"
            />
          </div>

          <div>
            <h3 className="font-heading text-sm font-bold">Steps</h3>
            <ol className="mt-2.5 flex flex-col gap-4">
              {recipe.steps.map((step, index) => {
                const imageUrl = recipeStepImageUrl(recipe.id, step);
                return (
                  <li key={step.id} className="flex gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm leading-relaxed">{step.text}</p>
                      {imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imageUrl}
                          alt={`Step ${index + 1}`}
                          className="mt-2 aspect-video w-full rounded-lg border border-border object-cover"
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        {activity.length > 0 && (
          <div className="no-print mt-6 shrink-0 border-t border-border pt-4">
            <p className="mb-2.5 text-xs font-semibold tracking-wide text-muted-foreground">
              WHO&rsquo;S COOKED THIS
            </p>
            <div className="flex flex-col gap-2">
              {activity.map((a) => (
                <div key={a.profileId} className="flex items-center gap-2">
                  <Avatar className="size-6 shrink-0">
                    <AvatarFallback
                      className={cn(
                        a.color,
                        "text-[10px] font-semibold text-white",
                      )}
                    >
                      {a.name.trim().charAt(0).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 truncate text-sm">{a.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {a.cooked ? "Cooked" : a.rating ? `★ ${a.rating}` : null}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

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
              This permanently deletes the recipe and its photos. This can’t be
              undone.
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
    </aside>
  );
}
