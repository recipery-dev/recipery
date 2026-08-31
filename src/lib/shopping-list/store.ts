import { mutateJson, readJson } from "@/lib/store";
import { EMPTY_SHOPPING_LIST, type ShoppingList } from "@/lib/shopping-list";

function keyFor(profileId: string): string {
  return `shopping-list/${profileId}.json`;
}

export async function getShoppingList(profileId: string): Promise<ShoppingList> {
  const stored = await readJson<ShoppingList>(keyFor(profileId));
  return stored ?? EMPTY_SHOPPING_LIST;
}

/** Idempotent — adding the same recipe twice doesn't duplicate it. */
export async function addRecipeToShoppingList(profileId: string, recipeId: string): Promise<ShoppingList> {
  return mutateJson<ShoppingList>(keyFor(profileId), (current) => {
    const list = current ?? EMPTY_SHOPPING_LIST;
    if (list.recipeIds.includes(recipeId)) return list;
    return { ...list, recipeIds: [...list.recipeIds, recipeId] };
  });
}

export async function removeRecipeFromShoppingList(profileId: string, recipeId: string): Promise<ShoppingList> {
  return mutateJson<ShoppingList>(keyFor(profileId), (current) => {
    const list = current ?? EMPTY_SHOPPING_LIST;
    return { ...list, recipeIds: list.recipeIds.filter((id) => id !== recipeId) };
  });
}

/** Full replace — the client always sends the complete checked-off set. */
export async function setCheckedOff(profileId: string, checkedOff: string[]): Promise<ShoppingList> {
  return mutateJson<ShoppingList>(keyFor(profileId), (current) => ({
    ...(current ?? EMPTY_SHOPPING_LIST),
    checkedOff,
  }));
}

export async function clearShoppingList(profileId: string): Promise<ShoppingList> {
  return mutateJson<ShoppingList>(keyFor(profileId), () => EMPTY_SHOPPING_LIST);
}
