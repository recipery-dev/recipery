import type {
  RecipeDifficulty,
  RecipeFields,
  RecipeImages,
  RecipeIngredient,
  RecipeStep,
} from "./types";

/** Parses the JSON blobs a recipe create/edit multipart submit carries
 * alongside its files — tolerant of malformed input since it's all
 * client-controlled form data, not trusted structured input. */

export function normalizeTags(parsed: unknown): string[] {
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((t): t is string => typeof t === "string" && t.trim().length > 0).map((t) => t.trim());
}

function parseJsonField(raw: FormDataEntryValue | null): unknown {
  if (typeof raw !== "string") return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function parseTagsField(raw: FormDataEntryValue | null): string[] {
  return normalizeTags(parseJsonField(raw));
}

export function normalizeIngredients(parsed: unknown): RecipeIngredient[] {
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((i) => i && typeof i === "object" && typeof i.name === "string" && i.name.trim())
    .map((i) => {
      const isGroup = !!i.isGroup;
      return {
        id: typeof i.id === "string" && i.id ? i.id : crypto.randomUUID(),
        // A group row is just a section label — quantity/unit/note never apply.
        quantity: !isGroup && typeof i.quantity === "string" && i.quantity.trim() ? i.quantity.trim() : undefined,
        unit: !isGroup && typeof i.unit === "string" && i.unit.trim() ? i.unit.trim() : undefined,
        name: i.name.trim(),
        note: !isGroup && typeof i.note === "string" && i.note.trim() ? i.note.trim() : undefined,
        isGroup: isGroup || undefined,
      };
    });
}

export function parseIngredientsField(raw: FormDataEntryValue | null): RecipeIngredient[] {
  return normalizeIngredients(parseJsonField(raw));
}

/** Parses the client's steps JSON, preserving whatever hasImage/imageExt/
 * imageUpdatedAt it already knows about (an edit submit echoes the current
 * state for steps whose photo isn't being replaced) — the caller then
 * overwrites individual steps as it processes attached files. */
export function normalizeSteps(parsed: unknown): RecipeStep[] {
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((s) => s && typeof s === "object" && typeof s.text === "string" && s.text.trim())
    .map((s) => ({
      id: typeof s.id === "string" && s.id ? s.id : crypto.randomUUID(),
      text: s.text.trim(),
      hasImage: !!s.hasImage,
      imageExt: typeof s.imageExt === "string" ? s.imageExt : undefined,
      imageUpdatedAt: typeof s.imageUpdatedAt === "string" ? s.imageUpdatedAt : undefined,
    }));
}

export function parseStepsField(raw: FormDataEntryValue | null): RecipeStep[] {
  return normalizeSteps(parseJsonField(raw));
}

export function extToFor(contentType: string): string {
  return contentType.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
}

function stringField(form: FormData, key: string): string | undefined {
  const raw = form.get(key);
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

function numberField(form: FormData, key: string): number | undefined {
  const raw = stringField(form, key);
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
}

/** Only http(s) links are kept — anything else is dropped rather than stored. */
export function cleanHttpUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? value : undefined;
  } catch {
    return undefined;
  }
}

export function cleanDifficulty(value: unknown): RecipeDifficulty | undefined {
  return value === "easy" || value === "medium" || value === "hard" ? value : undefined;
}

async function uploadFrom(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size === 0) return undefined;
  return { data: Buffer.from(await file.arrayBuffer()), contentType: file.type || "image/jpeg" };
}

/** Reads a recipe create/edit multipart submit into plain fields plus the
 * attached photos — shared by the create and edit routes. Returns null when
 * the title is missing. */
export async function parseRecipeForm(
  form: FormData
): Promise<{ fields: RecipeFields; images: RecipeImages } | null> {
  const title = stringField(form, "title");
  if (!title) return null;

  const fields: RecipeFields = {
    title,
    source: stringField(form, "source"),
    sourceUrl: stringField(form, "sourceUrl"),
    videoUrl: cleanHttpUrl(stringField(form, "videoUrl")),
    description: stringField(form, "description"),
    servings: numberField(form, "servings"),
    prepMinutes: numberField(form, "prepMinutes"),
    cookMinutes: numberField(form, "cookMinutes"),
    difficulty: cleanDifficulty(stringField(form, "difficulty")),
    cuisine: stringField(form, "cuisine"),
    tags: parseTagsField(form.get("tags")),
    ingredients: parseIngredientsField(form.get("ingredients")),
    steps: parseStepsField(form.get("steps")),
  };

  const images: RecipeImages = {
    cover: await uploadFrom(form.get("image")),
    removeCover: form.get("removeImage") === "1",
    steps: {},
  };
  for (const step of fields.steps) {
    const upload = await uploadFrom(form.get(`step-image-${step.id}`));
    if (upload) images.steps[step.id] = upload;
  }

  return { fields, images };
}
