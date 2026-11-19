import { getStorage, type StorageDriver } from "@/lib/storage";
import { mutateJson, readJson } from "@/lib/store";
import { getSettings } from "@/lib/settings/store";
import { listProfiles } from "@/lib/profiles/store";
import {
  applyProfileState,
  deleteProfileRecipeState,
  getProfileState,
  updateProfileRecipeState,
  type ProfileRecipeState,
} from "@/lib/profiles/state";
import { contentTypeFor } from "@/lib/content-type";
import { extToFor } from "./form";
import { scrapeRecipeFromUrl } from "./scrape";
import { browseAllSources, searchAllSources, type SimilarRecipeResult } from "./find-similar";
import { slugify, uniqueSlug } from "./slug";
import type {
  ImageUpload,
  Recipe,
  RecipeFields,
  RecipeImages,
  RecipeRecord,
  RecipeStep,
} from "./types";

/** A failure the caller should show to the user as-is. `status` is the HTTP
 * status the REST routes answer with; the MCP tools just show the message. */
export class ServiceError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

const INDEX_KEY = "index.json";

function metadataKey(id: string): string {
  return `recipes/${id}/metadata.json`;
}

async function writeRecord(record: RecipeRecord): Promise<void> {
  await getStorage().put(
    metadataKey(record.id),
    Buffer.from(JSON.stringify(record, null, 2), "utf-8"),
    "application/json"
  );
}

export async function listRecipeRecords(): Promise<RecipeRecord[]> {
  return (await readJson<RecipeRecord[]>(INDEX_KEY)) ?? [];
}

export async function getRecipeRecord(id: string): Promise<RecipeRecord> {
  const record = await readJson<RecipeRecord>(metadataKey(id));
  if (!record) throw new ServiceError(404, "Recipe not found");
  return record;
}

/** The library as one profile sees it — every recipe with that profile's
 * rating/favorite/cooked state applied. */
export async function listRecipesForProfile(profileId: string): Promise<Recipe[]> {
  const [records, state] = await Promise.all([listRecipeRecords(), getProfileState(profileId)]);
  return records.map((record) => applyProfileState(record, state[record.id]));
}

export async function getRecipeForProfile(profileId: string, id: string): Promise<Recipe> {
  const [record, state] = await Promise.all([getRecipeRecord(id), getProfileState(profileId)]);
  return applyProfileState(record, state[id]);
}

async function checkImageSizes(images: RecipeImages): Promise<void> {
  const { imageMaxSizeMb } = await getSettings();
  const maxBytes = imageMaxSizeMb * 1024 * 1024;
  if (images.cover && images.cover.data.length > maxBytes) {
    throw new ServiceError(
      413,
      `Photo is larger than the ${imageMaxSizeMb}MB upload limit (Settings → Library)`
    );
  }
  for (const upload of Object.values(images.steps)) {
    if (upload.data.length > maxBytes) {
      throw new ServiceError(413, `A step photo is larger than the ${imageMaxSizeMb}MB upload limit`);
    }
  }
}

/** Writes any step photos that came with the request, and flags those steps. */
async function writeStepImages(
  storage: StorageDriver,
  id: string,
  steps: RecipeStep[],
  uploads: Record<string, ImageUpload>
): Promise<void> {
  for (const step of steps) {
    const upload = uploads[step.id];
    if (!upload) continue;
    const ext = extToFor(upload.contentType);
    await storage.put(`recipes/${id}/steps/${step.id}.${ext}`, upload.data, upload.contentType);
    step.hasImage = true;
    step.imageExt = ext;
    step.imageUpdatedAt = new Date().toISOString();
  }
}

export async function createRecipe(
  fields: RecipeFields,
  images: RecipeImages = { steps: {} },
  { enforceImageLimit = true }: { enforceImageLimit?: boolean } = {}
): Promise<RecipeRecord> {
  if (enforceImageLimit) await checkImageSizes(images);

  const storage = getStorage();
  const index = await listRecipeRecords();
  const id = uniqueSlug(slugify(fields.title), new Set(index.map((r) => r.id)));

  const steps = fields.steps.map((s) => ({ ...s }));

  let hasImage = false;
  let coverExt: string | undefined;
  let coverUpdatedAt: string | undefined;
  if (images.cover) {
    coverExt = extToFor(images.cover.contentType);
    await storage.put(`recipes/${id}/image.${coverExt}`, images.cover.data, images.cover.contentType);
    hasImage = true;
    coverUpdatedAt = new Date().toISOString();
  }
  await writeStepImages(storage, id, steps, images.steps);

  const record: RecipeRecord = {
    ...fields,
    id,
    steps,
    addedAt: new Date().toISOString(),
    hasImage,
    coverExt,
    coverUpdatedAt,
  };
  await writeRecord(record);
  await mutateJson<RecipeRecord[]>(INDEX_KEY, (current) => [...(current ?? []).filter((r) => r.id !== id), record]);
  return record;
}

/** Replaces every editable field — callers wanting a partial update merge
 * into the existing record first (see `mergeRecipeFields`). */
export async function updateRecipe(
  id: string,
  fields: RecipeFields,
  images: RecipeImages = { steps: {} }
): Promise<RecipeRecord> {
  const existing = await getRecipeRecord(id);
  await checkImageSizes(images);

  const storage = getStorage();
  const steps = fields.steps.map((s) => ({ ...s }));

  let { hasImage, coverExt, coverUpdatedAt } = existing;
  if (images.cover) {
    const ext = extToFor(images.cover.contentType);
    await storage.put(`recipes/${id}/image.${ext}`, images.cover.data, images.cover.contentType);
    // A different extension leaves the old file orphaned.
    if (existing.coverExt && existing.coverExt !== ext) {
      await storage.delete(`recipes/${id}/image.${existing.coverExt}`);
    }
    hasImage = true;
    coverExt = ext;
    coverUpdatedAt = new Date().toISOString();
  } else if (images.removeCover && existing.hasImage) {
    if (existing.coverExt) await storage.delete(`recipes/${id}/image.${existing.coverExt}`);
    hasImage = false;
    coverExt = undefined;
    coverUpdatedAt = undefined;
  }

  await writeStepImages(storage, id, steps, images.steps);

  // A step can be removed, have its photo cleared, or get a replacement photo
  // with a different extension — in each case the old file at its previous
  // path is now orphaned, so clean it up rather than leaving it in storage.
  const currentStepImages = new Map(steps.map((s) => [s.id, s.hasImage ? s.imageExt : undefined]));
  await Promise.all(
    existing.steps
      .filter((s) => s.hasImage && s.imageExt && currentStepImages.get(s.id) !== s.imageExt)
      .map((s) => storage.delete(`recipes/${id}/steps/${s.id}.${s.imageExt}`))
  );

  const updated: RecipeRecord = {
    ...existing,
    ...fields,
    sourceUrl: fields.sourceUrl ?? existing.sourceUrl,
    steps,
    hasImage,
    coverExt,
    coverUpdatedAt,
  };
  await writeRecord(updated);
  await mutateJson<RecipeRecord[]>(INDEX_KEY, (current) => (current ?? []).map((r) => (r.id === id ? updated : r)));
  return updated;
}

type ScalarFieldKey = Exclude<keyof RecipeFields, "steps">;

/** A partial edit: a missing key leaves the field alone, `null` clears it. */
export type RecipeFieldsPatch = {
  [K in ScalarFieldKey]?: RecipeFields[K] | null;
} & { steps?: Array<Pick<RecipeStep, "text"> & { id?: string }> };

/** Applies a partial edit on top of a record. A `steps` list keeps the photo
 * of any step whose id, or exact text, is unchanged. */
export function mergeRecipeFields(existing: RecipeRecord, patch: RecipeFieldsPatch): RecipeFields {
  const { steps: patchSteps, ...scalars } = patch;
  const merged: RecipeFields = {
    title: existing.title,
    source: existing.source,
    sourceUrl: existing.sourceUrl,
    videoUrl: existing.videoUrl,
    description: existing.description,
    servings: existing.servings,
    prepMinutes: existing.prepMinutes,
    cookMinutes: existing.cookMinutes,
    difficulty: existing.difficulty,
    cuisine: existing.cuisine,
    tags: existing.tags,
    ingredients: existing.ingredients,
    steps: existing.steps,
  };

  const target = merged as Record<string, unknown>;
  for (const [key, value] of Object.entries(scalars)) {
    if (value === undefined) continue;
    target[key] = value === null ? undefined : value;
  }

  if (patchSteps) {
    const byId = new Map(existing.steps.map((s) => [s.id, s]));
    const byText = new Map(existing.steps.map((s) => [s.text, s]));
    merged.steps = patchSteps.map((s) => {
      const match = (s.id ? byId.get(s.id) : undefined) ?? byText.get(s.text);
      return match
        ? { ...match, text: s.text }
        : { id: crypto.randomUUID(), text: s.text, hasImage: false };
    });
  }
  return merged;
}

async function copyFile(storage: StorageDriver, fromKey: string, toKey: string) {
  const chunks: Buffer[] = [];
  for await (const chunk of await storage.get(fromKey)) chunks.push(chunk as Buffer);
  await storage.put(toKey, Buffer.concat(chunks), contentTypeFor(toKey));
}

export async function duplicateRecipe(id: string): Promise<RecipeRecord> {
  const recipe = await getRecipeRecord(id);
  const index = await listRecipeRecords();
  const newId = uniqueSlug(id, new Set(index.map((r) => r.id)));

  const storage = getStorage();
  if (recipe.hasImage && recipe.coverExt) {
    await copyFile(storage, `recipes/${id}/image.${recipe.coverExt}`, `recipes/${newId}/image.${recipe.coverExt}`);
  }
  for (const step of recipe.steps) {
    if (!step.hasImage || !step.imageExt) continue;
    await copyFile(
      storage,
      `recipes/${id}/steps/${step.id}.${step.imageExt}`,
      `recipes/${newId}/steps/${step.id}.${step.imageExt}`
    );
  }

  const record: RecipeRecord = {
    ...recipe,
    id: newId,
    title: `${recipe.title} (Copy)`,
    addedAt: new Date().toISOString(),
  };
  await writeRecord(record);
  await mutateJson<RecipeRecord[]>(INDEX_KEY, (current) => [...(current ?? []), record]);
  return record;
}

/** Callers decide who may delete (the app only lets admins). */
export async function deleteRecipe(id: string): Promise<void> {
  await getRecipeRecord(id);

  const storage = getStorage();
  const keys = await storage.list(`recipes/${id}/`);
  await Promise.all(keys.map((key) => storage.delete(key)));

  await mutateJson<RecipeRecord[]>(INDEX_KEY, (current) => (current ?? []).filter((r) => r.id !== id));

  const profiles = await listProfiles();
  await Promise.all(profiles.map((p) => deleteProfileRecipeState(p.id, id)));
}

export async function importRecipeFromUrl(rawUrl: string): Promise<RecipeRecord> {
  const url = rawUrl.trim();
  if (!url) throw new ServiceError(400, "A URL is required");
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new ServiceError(400, "That doesn't look like a valid URL");
  }
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new ServiceError(400, "Only http/https URLs are supported");
  }

  let scraped;
  try {
    scraped = await scrapeRecipeFromUrl(parsedUrl.toString());
  } catch (error) {
    throw new ServiceError(422, (error as Error).message);
  }

  let cover: ImageUpload | undefined;
  if (scraped.imageUrl) {
    try {
      const imageRes = await fetch(scraped.imageUrl);
      if (imageRes.ok) {
        cover = {
          data: Buffer.from(await imageRes.arrayBuffer()),
          contentType: imageRes.headers.get("content-type") ?? "image/jpeg",
        };
      }
    } catch {
      // Photo download failing shouldn't block the import — the recipe is
      // still useful without a hero image, and it can be added manually.
    }
  }

  const fields: RecipeFields = {
    title: scraped.title,
    source: scraped.source,
    sourceUrl: scraped.sourceUrl,
    videoUrl: scraped.videoUrl,
    description: scraped.description,
    servings: scraped.servings,
    prepMinutes: scraped.prepMinutes,
    cookMinutes: scraped.cookMinutes,
    cuisine: scraped.cuisine,
    tags: scraped.tags,
    ingredients: scraped.ingredients.map((i) => ({ id: crypto.randomUUID(), ...i })),
    steps: scraped.steps.map((text) => ({ id: crypto.randomUUID(), text, hasImage: false })),
  };

  // The photo size limit is for uploads — a scraped cover is stored as-is.
  return createRecipe(fields, { cover, steps: {} }, { enforceImageLimit: false });
}

export interface RecipeStatePatch {
  rating?: number;
  favorite?: boolean;
  cooked?: boolean;
}

/** Rating (0 clears it), favorite, and cooked — all per-profile. */
export async function setRecipeState(
  profileId: string,
  id: string,
  body: RecipeStatePatch
): Promise<Recipe> {
  const record = await getRecipeRecord(id);

  const patch: Partial<ProfileRecipeState> = {};
  if (body.rating !== undefined) {
    if (typeof body.rating !== "number" || !Number.isInteger(body.rating) || body.rating < 0 || body.rating > 5) {
      throw new ServiceError(400, "rating must be an integer 0-5");
    }
    patch.rating = body.rating === 0 ? undefined : body.rating;
  }
  if (body.favorite !== undefined) patch.favorite = !!body.favorite;
  if (body.cooked !== undefined) {
    patch.cooked = !!body.cooked;
    if (body.cooked) patch.lastCookedAt = new Date().toISOString();
  }

  const state = await updateProfileRecipeState(profileId, id, patch);
  return applyProfileState(record, state);
}

/** Discover / Find Similar: searches every configured recipe site for `query`,
 * or browses them when there is none. */
export async function discoverRecipes(query?: string): Promise<SimilarRecipeResult[]> {
  const { recipeDiscoverySources: sources } = await getSettings();
  if (sources.length === 0) {
    throw new ServiceError(400, "No recipe discovery sources are configured — add one in Settings.");
  }
  const q = query?.trim();
  const { results, failedSources } = q ? await searchAllSources(sources, q) : await browseAllSources(sources);
  if (results.length === 0 && failedSources.length > 0) {
    throw new ServiceError(502, `Couldn't load recipes — ${failedSources.join(", ")} didn't respond.`);
  }
  return results;
}
