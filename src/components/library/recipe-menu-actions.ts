import { ChefHat, Heart, Pencil, Star, type LucideIcon } from "lucide-react";
import type { Recipe, RecipeRecord } from "@/lib/recipes/types";

export interface RecipeMenuAction {
  key: string;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}

interface RecipeMenuActionsArgs {
  recipe: Recipe;
  onUpdateRecipe: (recipeId: string, patch: { rating?: number; favorite?: boolean; cooked?: boolean }) => void;
  onEditRecipe: (recipe: RecipeRecord) => void;
  onRate: () => void;
}

/**
 * The recipe actions shared by the library grid's right-click menu and the
 * preview panel's "More options" menu — one canonical order and wording so
 * the two don't drift apart. Callers that already expose one of these
 * actions elsewhere (e.g. a dedicated Favorite button) can filter it out by
 * `key` rather than hand-rolling their own copy.
 */
export function getRecipeMenuActions({
  recipe,
  onUpdateRecipe,
  onEditRecipe,
  onRate,
}: RecipeMenuActionsArgs): RecipeMenuAction[] {
  return [
    {
      key: "favorite",
      icon: Heart,
      label: recipe.favorite ? "Remove from favorites" : "Add to favorites",
      onClick: () => onUpdateRecipe(recipe.id, { favorite: !recipe.favorite }),
    },
    {
      key: "rate",
      icon: Star,
      label: `Rate${recipe.rating ? ` (${recipe.rating}/5)` : ""}`,
      onClick: onRate,
    },
    {
      key: "cooked",
      icon: ChefHat,
      label: recipe.cooked ? "Mark as not cooked" : "Mark as cooked",
      onClick: () => onUpdateRecipe(recipe.id, { cooked: !recipe.cooked }),
    },
    {
      key: "edit",
      icon: Pencil,
      label: "Edit",
      onClick: () => onEditRecipe(recipe),
    },
  ];
}
