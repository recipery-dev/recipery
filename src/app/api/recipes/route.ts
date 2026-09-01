import { NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { mutateJson, readJson } from "@/lib/store";
import { getSettings } from "@/lib/settings/store";
import { slugify } from "@/lib/recipes/slug";
import { parseIngredientsField, parseStepsField, parseTagsField, extToFor } from "@/lib/recipes/form";
import type { RecipeRecord, RecipeDifficulty } from "@/lib/recipes/types";

export async function GET() {
  const index = (await readJson<RecipeRecord[]>("index.json")) ?? [];
  return NextResponse.json({ recipes: index });
}

function uniqueSlug(baseSlug: string, taken: Set<string>): string {
  if (!taken.has(baseSlug)) return baseSlug;
  let n = 2;
  while (taken.has(`${baseSlug}-${n}`)) n++;
  return `${baseSlug}-${n}`;
}

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

export async function POST(request: Request) {
  const form = await request.formData();
  const title = stringField(form, "title");
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const { imageMaxSizeMb } = await getSettings();
  const maxBytes = imageMaxSizeMb * 1024 * 1024;

  const storage = getStorage();
  const index = (await readJson<RecipeRecord[]>("index.json")) ?? [];
  const id = uniqueSlug(slugify(title), new Set(index.map((r) => r.id)));

  const difficultyRaw = stringField(form, "difficulty");
  const difficulty: RecipeDifficulty | undefined =
    difficultyRaw === "easy" || difficultyRaw === "medium" || difficultyRaw === "hard"
      ? difficultyRaw
      : undefined;

  const steps = parseStepsField(form.get("steps"));

  let hasImage = false;
  let coverExt: string | undefined;
  let coverUpdatedAt: string | undefined;

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

  const record: RecipeRecord = {
    id,
    title,
    source: stringField(form, "source"),
    sourceUrl: stringField(form, "sourceUrl"),
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
    addedAt: new Date().toISOString(),
    hasImage,
    coverExt,
    coverUpdatedAt,
  };

  await storage.put(
    `recipes/${id}/metadata.json`,
    Buffer.from(JSON.stringify(record, null, 2), "utf-8"),
    "application/json"
  );

  await mutateJson<RecipeRecord[]>("index.json", (current) => {
    const list = current ?? [];
    return [...list.filter((r) => r.id !== id), record];
  });

  return NextResponse.json({ recipe: record }, { status: 201 });
}
