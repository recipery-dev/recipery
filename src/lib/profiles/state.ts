import { mutateJson, readJson } from "@/lib/store";
import { recipeThumbnailUrl, type Recipe, type RecipeRecord } from "@/lib/recipes/types";

/** Per-profile state for one recipe — rating, favorite, cooked status, and
 * collection membership stay out of the shared RecipeRecord. */
export interface ProfileRecipeState {
  rating?: number;
  favorite?: boolean;
  cooked?: boolean;
  lastCookedAt?: string;
}

export type ProfileState = Record<string, ProfileRecipeState>;

function stateKey(profileId: string): string {
  return `profiles/${profileId}/state.json`;
}

export async function getProfileState(profileId: string): Promise<ProfileState> {
  return (await readJson<ProfileState>(stateKey(profileId))) ?? {};
}

export async function setProfileState(profileId: string, state: ProfileState): Promise<void> {
  await mutateJson<ProfileState>(stateKey(profileId), () => state);
}

export async function updateProfileRecipeState(
  profileId: string,
  recipeId: string,
  patch: Partial<ProfileRecipeState>
): Promise<ProfileRecipeState> {
  const next = await mutateJson<ProfileState>(stateKey(profileId), (current) => {
    const state = current ?? {};
    const existing = state[recipeId] ?? {};
    return { ...state, [recipeId]: { ...existing, ...patch } };
  });
  return next[recipeId] ?? {};
}

export async function deleteProfileRecipeState(profileId: string, recipeId: string): Promise<void> {
  await mutateJson<ProfileState>(stateKey(profileId), (current) => {
    if (!current || !(recipeId in current)) return current ?? {};
    const rest = { ...current };
    delete rest[recipeId];
    return rest;
  });
}

export function applyProfileState(record: RecipeRecord, state?: ProfileRecipeState): Recipe {
  return {
    ...record,
    rating: state?.rating,
    favorite: !!state?.favorite,
    cooked: !!state?.cooked,
    lastCookedAt: state?.lastCookedAt,
    coverUrl: recipeThumbnailUrl(record),
  };
}
