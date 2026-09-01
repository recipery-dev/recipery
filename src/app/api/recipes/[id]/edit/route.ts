import { NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { mutateJson, readJson } from "@/lib/store";
import { getSettings } from "@/lib/settings/store";
import { parseIngredientsField, parseStepsField, parseTagsField, extToFor } from "@/lib/recipes/form";
import type { RecipeDifficulty, RecipeRecord } from "@/lib/recipes/types";

function numberField(form: FormData, key: string): number | undefined {
  const raw = form.get(key);
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
}

function stringField(form: FormData, key: string): string | undefined {
  const raw = form.get(key);
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

function urlField(form: FormData, key: string): string | undefined {
  const value = stringField(form, key);
  if (!value) return undefined;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? value : undefined;
  } catch {
    return undefined;
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existing = await readJson<RecipeRecord>(`recipes/${id}/metadata.json`);
  if (!existing) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const form = await request.formData();
  const title = stringField(form, "title");
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const { imageMaxSizeMb } = await getSettings();
  const maxBytes = imageMaxSizeMb * 1024 * 1024;
  const storage = getStorage();

  const difficultyRaw = stringField(form, "difficulty");
  const difficulty: RecipeDifficulty | undefined =
    difficultyRaw === "easy" || difficultyRaw === "medium" || difficultyRaw === "hard"
      ? difficultyRaw
      : undefined;

  // Echoes back hasImage/imageExt for steps whose photo isn't being replaced.
  const steps = parseStepsField(form.get("steps"));

  let hasImage = existing.hasImage;
  let coverExt = existing.coverExt;
  let coverUpdatedAt = existing.coverUpdatedAt;

  const image = form.get("image");
  if (image instanceof File && image.size > 0) {
    if (image.size > maxBytes) {
      return NextResponse.json(
        { error: `Photo is larger than the ${imageMaxSizeMb}MB upload limit (Settings → Library)` },
        { status: 413 }
      );
    }
    const buffer = Buffer.from(await image.arrayBuffer());
    const ext = extToFor(image.type || "image/jpeg");
    await storage.put(`recipes/${id}/image.${ext}`, buffer, image.type || "image/jpeg");
    hasImage = true;
    coverExt = ext;
    coverUpdatedAt = new Date().toISOString();
  }

  for (const step of steps) {
    const file = form.get(`step-image-${step.id}`);
    if (file instanceof File && file.size > 0) {
      if (file.size > maxBytes) {
        return NextResponse.json(
          { error: `A step photo is larger than the ${imageMaxSizeMb}MB upload limit` },
          { status: 413 }
        );
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = extToFor(file.type || "image/jpeg");
      await storage.put(`recipes/${id}/steps/${step.id}.${ext}`, buffer, file.type || "image/jpeg");
      step.hasImage = true;
      step.imageExt = ext;
      step.imageUpdatedAt = new Date().toISOString();
    }
  }

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
    title,
    source: stringField(form, "source"),
    sourceUrl: stringField(form, "sourceUrl") ?? existing.sourceUrl,
    videoUrl: urlField(form, "videoUrl"),
    description: stringField(form, "description"),
    servings: numberField(form, "servings"),
    prepMinutes: numberField(form, "prepMinutes"),
    cookMinutes: numberField(form, "cookMinutes"),
    difficulty,
    cuisine: stringField(form, "cuisine"),
    tags: parseTagsField(form.get("tags")),
    ingredients: parseIngredientsField(form.get("ingredients")),
    steps,
    hasImage,
    coverExt,
    coverUpdatedAt,
  };

  await storage.put(
    `recipes/${id}/metadata.json`,
    Buffer.from(JSON.stringify(updated, null, 2), "utf-8"),
    "application/json"
  );

  await mutateJson<RecipeRecord[]>("index.json", (current) =>
    (current ?? []).map((r) => (r.id === id ? updated : r))
  );

  return NextResponse.json({ recipe: updated });
}
