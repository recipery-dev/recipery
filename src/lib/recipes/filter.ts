import type { Recipe, RecipeDifficulty } from "./types";

export interface RecipeFilters {
  tags: string[];
  cuisines: string[];
  difficulties: RecipeDifficulty[];
}

export const EMPTY_RECIPE_FILTERS: RecipeFilters = { tags: [], cuisines: [], difficulties: [] };

export function isFiltersEmpty(filters: RecipeFilters): boolean {
  return filters.tags.length === 0 && filters.cuisines.length === 0 && filters.difficulties.length === 0;
}

/** AND across facets (tags/cuisine/difficulty each narrow the result), OR within one facet. */
export function filterRecipes(recipes: Recipe[], filters: RecipeFilters): Recipe[] {
  if (isFiltersEmpty(filters)) return recipes;
  return recipes.filter((recipe) => {
    if (filters.tags.length > 0 && !filters.tags.some((tag) => recipe.tags.includes(tag))) return false;
    if (filters.cuisines.length > 0 && !(recipe.cuisine && filters.cuisines.includes(recipe.cuisine)))
      return false;
    if (filters.difficulties.length > 0 && !(recipe.difficulty && filters.difficulties.includes(recipe.difficulty)))
      return false;
    return true;
  });
}

export function collectRecipeTags(recipes: Recipe[]): string[] {
  const tags = new Set<string>();
  for (const recipe of recipes) for (const tag of recipe.tags) tags.add(tag);
  return [...tags].sort((a, b) => a.localeCompare(b));
}

export function collectRecipeCuisines(recipes: Recipe[]): string[] {
  const cuisines = new Set<string>();
  for (const recipe of recipes) if (recipe.cuisine) cuisines.add(recipe.cuisine);
  return [...cuisines].sort((a, b) => a.localeCompare(b));
}
