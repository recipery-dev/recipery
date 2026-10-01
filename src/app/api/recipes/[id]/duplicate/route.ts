import { NextResponse } from "next/server";
import { getStorage, type StorageDriver } from "@/lib/storage";
import { mutateJson, readJson } from "@/lib/store";
import { uniqueSlug } from "@/lib/recipes/slug";
import { contentTypeFor } from "@/lib/content-type";
import type { RecipeRecord } from "@/lib/recipes/types";

async function copyFile(storage: StorageDriver, fromKey: string, toKey: string) {
  const chunks: Buffer[] = [];
  for await (const chunk of await storage.get(fromKey)) chunks.push(chunk as Buffer);
  await storage.put(toKey, Buffer.concat(chunks), contentTypeFor(toKey));
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const recipe = await readJson<RecipeRecord>(`recipes/${id}/metadata.json`);
  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const index = (await readJson<RecipeRecord[]>("index.json")) ?? [];
  const newId = uniqueSlug(id, new Set(index.map((r) => r.id)));

  const storage = getStorage();
  if (recipe.hasImage && recipe.coverExt) {
    await copyFile(
      storage,
      `recipes/${id}/image.${recipe.coverExt}`,
      `recipes/${newId}/image.${recipe.coverExt}`
    );
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

  await storage.put(
    `recipes/${newId}/metadata.json`,
    Buffer.from(JSON.stringify(record, null, 2), "utf-8"),
    "application/json"
  );

  await mutateJson<RecipeRecord[]>("index.json", (current) => [
    ...(current ?? []),
    record,
  ]);

  return NextResponse.json({ recipe: record }, { status: 201 });
}
