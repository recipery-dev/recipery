import type { RecipeRecord } from "./types";

/** Case-insensitive match on title, source, tags, or ingredient names (group
 * headers don't count). Shared by the search dialog and the MCP search tool. */
export function recipeMatchesQuery(
  recipe: Pick<RecipeRecord, "title" | "source" | "tags" | "ingredients">,
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return (
    recipe.title.toLowerCase().includes(q) ||
    (recipe.source?.toLowerCase().includes(q) ?? false) ||
    recipe.tags.some((t) => t.toLowerCase().includes(q)) ||
    recipe.ingredients.some((i) => !i.isGroup && i.name.toLowerCase().includes(q))
  );
}
