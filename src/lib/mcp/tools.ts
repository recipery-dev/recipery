import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  addRecipeToCollection,
  createCollection,
  deleteCollection,
  listCollections,
  removeRecipeFromCollection,
  updateCollection,
} from "@/lib/collections/store";
import type { Profile } from "@/lib/profiles/types";
import { normalizeIngredients, normalizeSteps, normalizeTags, cleanHttpUrl } from "@/lib/recipes/form";
import { recipeMatchesQuery } from "@/lib/recipes/search";
import {
  ServiceError,
  createRecipe,
  deleteRecipe,
  discoverRecipes,
  duplicateRecipe,
  getRecipeForProfile,
  getRecipeRecord,
  importRecipeFromUrl,
  listRecipesForProfile,
  mergeRecipeFields,
  setRecipeState,
  updateRecipe,
  type RecipeFieldsPatch,
} from "@/lib/recipes/service";
import { buildShoppingList } from "@/lib/recipes/shopping";
import type { Recipe, RecipeFields } from "@/lib/recipes/types";
import {
  addRecipeToShoppingList,
  clearShoppingList,
  getShoppingList,
  removeRecipeFromShoppingList,
  setCheckedOff,
} from "@/lib/shopping-list/store";
import { MCP_TOOLS, mcpToolInfo } from "./catalog";

// ---------------------------------------------------------------------------
// Input shapes
// ---------------------------------------------------------------------------

const ingredientInput = z.object({
  name: z.string().describe("Ingredient name, e.g. “flour”. For a section header, the header text."),
  quantity: z.union([z.string(), z.number()]).optional().describe("Amount as written, e.g. “2”, “1/2”"),
  unit: z.string().optional().describe("e.g. “cup”, “g”, “tbsp”"),
  note: z.string().optional().describe("e.g. “finely chopped”"),
  isGroup: z.boolean().optional().describe("true when this row is a section header such as “Filling”"),
});

const stepInput = z.union([
  z.string(),
  z.object({ id: z.string().optional(), text: z.string() }),
]);

const recipeShape = {
  description: z.string().optional(),
  source: z.string().optional().describe("Author or site name"),
  sourceUrl: z.string().optional().describe("Where the recipe came from"),
  videoUrl: z.string().optional().describe("Link to a video, e.g. YouTube"),
  servings: z.number().int().positive().optional(),
  prepMinutes: z.number().int().positive().optional(),
  cookMinutes: z.number().int().positive().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  cuisine: z.string().optional(),
  tags: z.array(z.string()).optional(),
  ingredients: z.array(ingredientInput).optional(),
  steps: z.array(stepInput).optional().describe("Instructions in order; plain strings are fine"),
};

// ---------------------------------------------------------------------------
// Output shapes
// ---------------------------------------------------------------------------

function summarize(r: Recipe) {
  return {
    id: r.id,
    title: r.title,
    source: r.source,
    cuisine: r.cuisine,
    difficulty: r.difficulty,
    tags: r.tags,
    servings: r.servings,
    prepMinutes: r.prepMinutes,
    cookMinutes: r.cookMinutes,
    rating: r.rating,
    favorite: r.favorite,
    cooked: r.cooked,
  };
}

function full(r: Recipe) {
  return {
    ...summarize(r),
    description: r.description,
    sourceUrl: r.sourceUrl,
    videoUrl: r.videoUrl,
    lastCookedAt: r.lastCookedAt,
    addedAt: r.addedAt,
    ingredients: r.ingredients.map(({ id, name, quantity, unit, note, isGroup }) => ({
      id,
      name,
      quantity,
      unit,
      note,
      isGroup,
    })),
    steps: r.steps.map(({ id, text }) => ({ id, text })),
  };
}

// ---------------------------------------------------------------------------
// Input cleanup
// ---------------------------------------------------------------------------

type RecipeInput = {
  [K in keyof typeof recipeShape]?: z.infer<(typeof recipeShape)[K]>;
};

function toSteps(input: RecipeInput["steps"]) {
  return input?.map((s) => (typeof s === "string" ? { text: s } : s));
}

function toIngredients(input: RecipeInput["ingredients"]) {
  return normalizeIngredients(
    input?.map((i) => ({ ...i, quantity: i.quantity === undefined ? undefined : String(i.quantity) }))
  );
}

function toFields(title: string, input: RecipeInput): RecipeFields {
  return {
    title,
    description: input.description?.trim() || undefined,
    source: input.source?.trim() || undefined,
    sourceUrl: input.sourceUrl?.trim() || undefined,
    videoUrl: cleanHttpUrl(input.videoUrl?.trim()),
    servings: input.servings,
    prepMinutes: input.prepMinutes,
    cookMinutes: input.cookMinutes,
    difficulty: input.difficulty,
    cuisine: input.cuisine?.trim() || undefined,
    tags: normalizeTags(input.tags),
    ingredients: toIngredients(input.ingredients),
    steps: normalizeSteps(toSteps(input.steps)),
  };
}

/** Same fields as a create, but each may also be `null` to clear it. */
type PatchInput = { title?: string } & {
  [K in "description" | "source" | "sourceUrl" | "videoUrl" | "cuisine"]?: string | null;
} & {
  [K in "servings" | "prepMinutes" | "cookMinutes" | "difficulty"]?: RecipeInput[K] | null;
} & Pick<RecipeInput, "tags" | "ingredients" | "steps">;

function blankToNull(value: string | null | undefined): string | null | undefined {
  return value === undefined ? undefined : value === null || value.trim() === "" ? null : value;
}

function toPatch(input: PatchInput): RecipeFieldsPatch {
  return {
    title: input.title?.trim() || undefined,
    description: blankToNull(input.description),
    source: blankToNull(input.source),
    sourceUrl: blankToNull(input.sourceUrl),
    videoUrl: input.videoUrl == null ? input.videoUrl : (cleanHttpUrl(input.videoUrl.trim()) ?? null),
    servings: input.servings,
    prepMinutes: input.prepMinutes,
    cookMinutes: input.cookMinutes,
    difficulty: input.difficulty,
    cuisine: blankToNull(input.cuisine),
    tags: input.tags === undefined ? undefined : normalizeTags(input.tags),
    ingredients: input.ingredients === undefined ? undefined : toIngredients(input.ingredients),
    steps: input.steps === undefined ? undefined : normalizeSteps(toSteps(input.steps)),
  };
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function fail(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

/** Runs a handler and turns any failure into a tool error the model can read
 * and react to, instead of a protocol-level error. */
async function run(fn: () => Promise<unknown>) {
  try {
    return ok(await fn());
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Something went wrong");
  }
}

async function requireRecipe(id: string) {
  await getRecipeRecord(id);
}

async function requireCollection(profileId: string, id: string) {
  const collections = await listCollections(profileId);
  const collection = collections.find((c) => c.id === id);
  if (!collection) throw new ServiceError(404, "Collection not found");
  return collection;
}

async function shoppingListView(profileId: string) {
  const [list, recipes] = await Promise.all([getShoppingList(profileId), listRecipesForProfile(profileId)]);
  const added = list.recipeIds
    .map((id) => recipes.find((r) => r.id === id))
    .filter((r): r is Recipe => !!r);
  const lines = buildShoppingList(added.map((recipe) => ({ recipe, factor: 1 })));
  return {
    recipes: added.map((r) => ({ id: r.id, title: r.title })),
    items: lines.map((line) => ({
      key: line.key,
      name: line.name,
      amounts: line.amounts,
      notes: line.notes,
      aisle: line.aisle,
      fromRecipes: line.fromRecipes.map((f) => f.recipeTitle),
      checked: list.checkedOff.includes(line.key),
    })),
  };
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/** Registers every tool in the catalog on `server`, acting as `profile`. */
export function registerTools(server: McpServer, profile: Profile): void {
  const handlers = {
    search_recipes: {
      input: {
        query: z.string().optional().describe("Matches title, source, tags, and ingredient names"),
        tag: z.string().optional(),
        cuisine: z.string().optional(),
        difficulty: z.enum(["easy", "medium", "hard"]).optional(),
        favorite: z.boolean().optional(),
        cooked: z.boolean().optional(),
        limit: z.number().int().min(1).max(100).optional().describe("Default 25"),
      },
      run: async (a: {
        query?: string;
        tag?: string;
        cuisine?: string;
        difficulty?: "easy" | "medium" | "hard";
        favorite?: boolean;
        cooked?: boolean;
        limit?: number;
      }) => {
        const tag = a.tag?.trim().toLowerCase();
        const cuisine = a.cuisine?.trim().toLowerCase();
        const matches = (await listRecipesForProfile(profile.id)).filter(
          (r) =>
            (!a.query?.trim() || recipeMatchesQuery(r, a.query)) &&
            (!tag || r.tags.some((t) => t.toLowerCase() === tag)) &&
            (!cuisine || r.cuisine?.toLowerCase() === cuisine) &&
            (!a.difficulty || r.difficulty === a.difficulty) &&
            (a.favorite === undefined || !!r.favorite === a.favorite) &&
            (a.cooked === undefined || !!r.cooked === a.cooked)
        );
        return { total: matches.length, results: matches.slice(0, a.limit ?? 25).map(summarize) };
      },
    },

    get_recipe: {
      input: { id: z.string().describe("Recipe id from search_recipes") },
      run: async (a: { id: string }) => full(await getRecipeForProfile(profile.id, a.id)),
    },

    create_recipe: {
      input: { title: z.string().min(1), ...recipeShape },
      run: async (a: { title: string } & RecipeInput) => {
        const record = await createRecipe(toFields(a.title.trim(), a), { steps: {} });
        return full(await getRecipeForProfile(profile.id, record.id));
      },
    },

    update_recipe: {
      input: {
        id: z.string(),
        title: z.string().optional(),
        // For these, null clears the field; leaving it out keeps it as is.
        description: recipeShape.description.nullable(),
        source: recipeShape.source.nullable(),
        sourceUrl: recipeShape.sourceUrl.nullable(),
        videoUrl: recipeShape.videoUrl.nullable(),
        servings: recipeShape.servings.nullable(),
        prepMinutes: recipeShape.prepMinutes.nullable(),
        cookMinutes: recipeShape.cookMinutes.nullable(),
        difficulty: recipeShape.difficulty.nullable(),
        cuisine: recipeShape.cuisine.nullable(),
        tags: recipeShape.tags,
        ingredients: recipeShape.ingredients,
        steps: recipeShape.steps,
      },
      run: async (a: { id: string } & PatchInput) => {
        const existing = await getRecipeRecord(a.id);
        await updateRecipe(a.id, mergeRecipeFields(existing, toPatch(a)), { steps: {} });
        return full(await getRecipeForProfile(profile.id, a.id));
      },
    },

    delete_recipe: {
      input: { id: z.string() },
      run: async (a: { id: string }) => {
        if (profile.role !== "admin") {
          throw new ServiceError(403, "Only an admin can delete recipes — the MCP profile is not an admin");
        }
        await deleteRecipe(a.id);
        return { ok: true };
      },
    },

    duplicate_recipe: {
      input: { id: z.string() },
      run: async (a: { id: string }) => {
        const copy = await duplicateRecipe(a.id);
        return full(await getRecipeForProfile(profile.id, copy.id));
      },
    },

    import_recipe_from_url: {
      input: { url: z.string().url() },
      run: async (a: { url: string }) => {
        const record = await importRecipeFromUrl(a.url);
        return full(await getRecipeForProfile(profile.id, record.id));
      },
    },

    discover_recipes: {
      input: { query: z.string().optional().describe("Leave out to browse instead of search") },
      run: async (a: { query?: string }) => ({ results: await discoverRecipes(a.query) }),
    },

    set_recipe_state: {
      input: {
        id: z.string(),
        rating: z.number().int().min(0).max(5).optional().describe("1-5, or 0 to clear"),
        favorite: z.boolean().optional(),
        cooked: z.boolean().optional(),
      },
      run: async (a: { id: string; rating?: number; favorite?: boolean; cooked?: boolean }) =>
        summarize(await setRecipeState(profile.id, a.id, a)),
    },

    list_collections: {
      input: {},
      run: async () => ({
        collections: (await listCollections(profile.id)).map((c) => ({
          id: c.id,
          name: c.name,
          color: c.color,
          recipeIds: c.recipeIds,
        })),
      }),
    },

    create_collection: {
      input: { name: z.string().min(1), color: z.string().optional().describe("A Tailwind class such as bg-blue-500") },
      run: async (a: { name: string; color?: string }) => createCollection(profile.id, a.name, a.color),
    },

    update_collection: {
      input: { id: z.string(), name: z.string().optional(), color: z.string().optional() },
      run: async (a: { id: string; name?: string; color?: string }) => {
        const patch: { name?: string; color?: string } = {};
        if (a.name?.trim()) patch.name = a.name.trim();
        if (a.color) patch.color = a.color;
        const collection = await updateCollection(profile.id, a.id, patch);
        if (!collection) throw new ServiceError(404, "Collection not found");
        return collection;
      },
    },

    delete_collection: {
      input: { id: z.string() },
      run: async (a: { id: string }) => {
        await requireCollection(profile.id, a.id);
        await deleteCollection(profile.id, a.id);
        return { ok: true };
      },
    },

    add_recipe_to_collection: {
      input: { collectionId: z.string(), recipeId: z.string() },
      run: async (a: { collectionId: string; recipeId: string }) => {
        await requireCollection(profile.id, a.collectionId);
        await requireRecipe(a.recipeId);
        const collections = await addRecipeToCollection(profile.id, a.collectionId, a.recipeId);
        return collections.find((c) => c.id === a.collectionId);
      },
    },

    remove_recipe_from_collection: {
      input: { collectionId: z.string(), recipeId: z.string() },
      run: async (a: { collectionId: string; recipeId: string }) => {
        await requireCollection(profile.id, a.collectionId);
        const collections = await removeRecipeFromCollection(profile.id, a.collectionId, a.recipeId);
        return collections.find((c) => c.id === a.collectionId);
      },
    },

    get_shopping_list: {
      input: {},
      run: async () => shoppingListView(profile.id),
    },

    add_recipe_to_shopping_list: {
      input: { recipeId: z.string() },
      run: async (a: { recipeId: string }) => {
        await requireRecipe(a.recipeId);
        await addRecipeToShoppingList(profile.id, a.recipeId);
        return shoppingListView(profile.id);
      },
    },

    remove_recipe_from_shopping_list: {
      input: { recipeId: z.string() },
      run: async (a: { recipeId: string }) => {
        await removeRecipeFromShoppingList(profile.id, a.recipeId);
        return shoppingListView(profile.id);
      },
    },

    set_shopping_items_checked: {
      input: { checkedOff: z.array(z.string()).describe("Item keys from get_shopping_list") },
      run: async (a: { checkedOff: string[] }) => {
        await setCheckedOff(profile.id, a.checkedOff);
        return shoppingListView(profile.id);
      },
    },

    clear_shopping_list: {
      input: {},
      run: async () => {
        await clearShoppingList(profile.id);
        return shoppingListView(profile.id);
      },
    },
  };

  for (const info of MCP_TOOLS) {
    const handler = handlers[info.name as keyof typeof handlers];
    if (!handler) throw new Error(`MCP tool "${info.name}" is in the catalog but has no handler`);
    // The handler map is typed per tool; registration only needs the common shape.
    const { input, run: runTool } = handler as unknown as {
      input: z.ZodRawShape;
      run: (args: never) => Promise<unknown>;
    };
    const { description, readOnly, name } = mcpToolInfo(info.name);
    server.registerTool(
      name,
      {
        description,
        inputSchema: input,
        annotations: { readOnlyHint: readOnly, openWorldHint: false },
      },
      async (args: unknown) => run(() => runTool(args as never))
    );
  }
}
