import { ChefHat, CircleDashed, Heart, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Recipe } from "@/lib/recipes/types";

/** Computed, non-editable pseudo-collections — derived from a profile's
 * recipe state on every render, never persisted. Kept structurally
 * compatible with `Collection` ({id, name, recipeIds}) so `/collection/[id]`
 * can render either. */
export interface SmartCollection {
  id: string;
  name: string;
  icon: LucideIcon;
  recipeIds: string[];
}

export function computeSmartCollections(recipes: Recipe[]): SmartCollection[] {
  return [
    {
      id: "favorite",
      name: "Favorites",
      icon: Heart,
      recipeIds: recipes.filter((r) => r.favorite).map((r) => r.id),
    },
    {
      id: "cooked",
      name: "Cooked",
      icon: ChefHat,
      recipeIds: recipes.filter((r) => r.cooked).map((r) => r.id),
    },
    {
      id: "never-cooked",
      name: "Never Cooked",
      icon: CircleDashed,
      recipeIds: recipes.filter((r) => !r.cooked).map((r) => r.id),
    },
    {
      id: "5-star",
      name: "5-Star",
      icon: Star,
      recipeIds: recipes.filter((r) => r.rating === 5).map((r) => r.id),
    },
  ];
}
