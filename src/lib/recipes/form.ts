import type { RecipeIngredient, RecipeStep } from "./types";

/** Parses the JSON blobs a recipe create/edit multipart submit carries
 * alongside its files — tolerant of malformed input since it's all
 * client-controlled form data, not trusted structured input. */

export function parseTagsField(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t): t is string => typeof t === "string" && t.trim().length > 0).map((t) => t.trim());
  } catch {
    return [];
  }
}

export function parseIngredientsField(raw: FormDataEntryValue | null): RecipeIngredient[] {
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((i) => i && typeof i === "object" && typeof i.name === "string" && i.name.trim())
      .map((i) => ({
        id: typeof i.id === "string" && i.id ? i.id : crypto.randomUUID(),
        quantity: typeof i.quantity === "string" && i.quantity.trim() ? i.quantity.trim() : undefined,
        unit: typeof i.unit === "string" && i.unit.trim() ? i.unit.trim() : undefined,
        name: i.name.trim(),
        note: typeof i.note === "string" && i.note.trim() ? i.note.trim() : undefined,
      }));
  } catch {
    return [];
  }
}

/** Parses the client's steps JSON, preserving whatever hasImage/imageExt/
 * imageUpdatedAt it already knows about (an edit submit echoes the current
 * state for steps whose photo isn't being replaced) — the caller then
 * overwrites individual steps as it processes attached files. */
export function parseStepsField(raw: FormDataEntryValue | null): RecipeStep[] {
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
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
  } catch {
    return [];
  }
}

export function extToFor(contentType: string): string {
  return contentType.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
}
