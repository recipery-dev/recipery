/**
 * Every tool the MCP endpoint exposes — name, group, and what it does.
 *
 * Kept free of server-only imports so the Settings → MCP screen can list the
 * same tools the server registers (see tools.ts, which holds the handlers and
 * is checked against this list in a test).
 */

export type McpToolGroup = "Recipes" | "Collections" | "Shopping list";

export interface McpToolInfo {
  name: string;
  group: McpToolGroup;
  description: string;
  /** read-only tools never change anything — clients can safely auto-approve them */
  readOnly: boolean;
}

export const MCP_TOOLS: McpToolInfo[] = [
  {
    name: "search_recipes",
    group: "Recipes",
    description:
      "Search the library by text (title, source, tag, ingredient) and/or filter by tag, cuisine, difficulty, favorite, or cooked. Returns short summaries — use get_recipe for the full recipe.",
    readOnly: true,
  },
  {
    name: "get_recipe",
    group: "Recipes",
    description: "Get one recipe in full: ingredients, steps, times, and your rating, favorite, and cooked state.",
    readOnly: true,
  },
  {
    name: "create_recipe",
    group: "Recipes",
    description:
      "Add a new recipe. Only the title is required. Ingredients are { name, quantity, unit, note } rows (set isGroup for a section header); steps are plain text.",
    readOnly: false,
  },
  {
    name: "update_recipe",
    group: "Recipes",
    description:
      "Change parts of a recipe. Fields you leave out stay as they are; pass null to clear one. Sending ingredients or steps replaces the whole list.",
    readOnly: false,
  },
  {
    name: "delete_recipe",
    group: "Recipes",
    description: "Delete a recipe and its photos for good. Only works when the MCP profile is an admin.",
    readOnly: false,
  },
  {
    name: "duplicate_recipe",
    group: "Recipes",
    description: "Make a copy of a recipe, titled “… (Copy)”, so it can be changed without touching the original.",
    readOnly: false,
  },
  {
    name: "import_recipe_from_url",
    group: "Recipes",
    description: "Import a recipe from a web page address, including its photo when there is one.",
    readOnly: false,
  },
  {
    name: "discover_recipes",
    group: "Recipes",
    description:
      "Search the recipe sites set up in Settings → Recipe Discovery, or browse them when no query is given. Use import_recipe_from_url on a result to save it.",
    readOnly: true,
  },
  {
    name: "set_recipe_state",
    group: "Recipes",
    description: "Set your rating (1-5, or 0 to clear), favorite flag, or cooked flag on a recipe.",
    readOnly: false,
  },
  {
    name: "list_collections",
    group: "Collections",
    description: "List your collections and the recipe ids in each.",
    readOnly: true,
  },
  {
    name: "create_collection",
    group: "Collections",
    description: "Create a collection.",
    readOnly: false,
  },
  {
    name: "update_collection",
    group: "Collections",
    description: "Rename a collection or change its color.",
    readOnly: false,
  },
  {
    name: "delete_collection",
    group: "Collections",
    description: "Delete a collection. The recipes in it stay in the library.",
    readOnly: false,
  },
  {
    name: "add_recipe_to_collection",
    group: "Collections",
    description: "Put a recipe in a collection.",
    readOnly: false,
  },
  {
    name: "remove_recipe_from_collection",
    group: "Collections",
    description: "Take a recipe out of a collection. The recipe itself is not deleted.",
    readOnly: false,
  },
  {
    name: "get_shopping_list",
    group: "Shopping list",
    description:
      "Get the shopping list: the recipes on it and the combined ingredient lines, grouped by aisle, with what is already checked off.",
    readOnly: true,
  },
  {
    name: "add_recipe_to_shopping_list",
    group: "Shopping list",
    description: "Add a recipe's ingredients to the shopping list.",
    readOnly: false,
  },
  {
    name: "remove_recipe_from_shopping_list",
    group: "Shopping list",
    description: "Remove a recipe from the shopping list.",
    readOnly: false,
  },
  {
    name: "set_shopping_items_checked",
    group: "Shopping list",
    description:
      "Replace the full set of checked-off shopping items. Pass the item keys from get_shopping_list; an empty list unchecks everything.",
    readOnly: false,
  },
  {
    name: "clear_shopping_list",
    group: "Shopping list",
    description: "Empty the shopping list.",
    readOnly: false,
  },
];

export function mcpToolInfo(name: string): McpToolInfo {
  const info = MCP_TOOLS.find((t) => t.name === name);
  if (!info) throw new Error(`Unknown MCP tool: ${name}`);
  return info;
}
