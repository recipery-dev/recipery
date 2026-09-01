export interface RecipeIngredient {
  id: string;
  quantity?: string;
  unit?: string;
  name: string;
  note?: string;
}

export interface RecipeStep {
  id: string;
  text: string;
  hasImage: boolean;
  imageExt?: string;
  /** when the step's image was last written — busts the cache when it's replaced */
  imageUpdatedAt?: string;
}

export type RecipeDifficulty = "easy" | "medium" | "hard";

export interface RecipeRecord {
  /** slug — also the directory name under recipes/, e.g. recipes/dracula-cake/ */
  id: string;
  title: string;
  /** author name or site the recipe came from */
  source?: string;
  /** set when the recipe was created via URL import */
  sourceUrl?: string;
  /** link to a video for this recipe (e.g. a YouTube video) */
  videoUrl?: string;
  description?: string;
  servings?: number;
  prepMinutes?: number;
  cookMinutes?: number;
  difficulty?: RecipeDifficulty;
  cuisine?: string;
  tags: string[];
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  addedAt: string;
  hasImage: boolean;
  coverExt?: string;
  /** when the hero photo was last written — busts the cache when it's replaced */
  coverUpdatedAt?: string;
}

/**
 * UI-facing shape: a recipe record plus a resolved photo URL and the active
 * profile's state. Rating/favorite/cooked/lastCookedAt live in
 * profiles/<id>/state.json, not on the shared RecipeRecord — see
 * lib/profiles/state.ts#applyProfileState.
 */
export interface Recipe extends RecipeRecord {
  coverUrl: string | null;
  /** 1-5, unset means unrated */
  rating?: number;
  favorite?: boolean;
  cooked?: boolean;
  lastCookedAt?: string;
}

export function recipeCoverUrl(
  record: Pick<RecipeRecord, "id" | "hasImage" | "coverExt" | "coverUpdatedAt">
): string | null {
  if (!record.hasImage || !record.coverExt) return null;
  const base = `/api/files/recipes/${record.id}/image.${record.coverExt}`;
  return record.coverUpdatedAt
    ? `${base}?v=${encodeURIComponent(record.coverUpdatedAt)}`
    : base;
}

export function recipeStepImageUrl(recipeId: string, step: RecipeStep): string | null {
  if (!step.hasImage || !step.imageExt) return null;
  const base = `/api/files/recipes/${recipeId}/steps/${step.id}.${step.imageExt}`;
  return step.imageUpdatedAt ? `${base}?v=${encodeURIComponent(step.imageUpdatedAt)}` : base;
}

export function totalMinutes(record: Pick<RecipeRecord, "prepMinutes" | "cookMinutes">): number | undefined {
  if (record.prepMinutes === undefined && record.cookMinutes === undefined) return undefined;
  return (record.prepMinutes ?? 0) + (record.cookMinutes ?? 0);
}

/** New recipes have no personal state yet — this is a plain, unrated recipe. */
export function toLibraryRecipe(record: RecipeRecord): Recipe {
  return { ...record, coverUrl: recipeCoverUrl(record) };
}
