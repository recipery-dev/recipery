export interface ShoppingList {
  recipeIds: string[];
  checkedOff: string[];
}

export const EMPTY_SHOPPING_LIST: ShoppingList = { recipeIds: [], checkedOff: [] };
