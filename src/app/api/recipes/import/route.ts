import { NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { mutateJson, readJson } from "@/lib/store";
import { slugify } from "@/lib/recipes/slug";
import { scrapeRecipeFromUrl } from "@/lib/recipes/scrape";
import type { RecipeIngredient, RecipeRecord, RecipeStep } from "@/lib/recipes/types";

function uniqueSlug(baseSlug: string, taken: Set<string>): string {
  if (!taken.has(baseSlug)) return baseSlug;
  let n = 2;
  while (taken.has(`${baseSlug}-${n}`)) n++;
  return `${baseSlug}-${n}`;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { url?: string };
  const url = body.url?.trim();
  if (!url) {
    return NextResponse.json({ error: "A URL is required" }, { status: 400 });
  }
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return NextResponse.json({ error: "That doesn't look like a valid URL" }, { status: 400 });
  }
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return NextResponse.json({ error: "Only http/https URLs are supported" }, { status: 400 });
  }

  let scraped;
  try {
    scraped = await scrapeRecipeFromUrl(parsedUrl.toString());
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 422 });
  }

  const storage = getStorage();
  const index = (await readJson<RecipeRecord[]>("index.json")) ?? [];
  const id = uniqueSlug(slugify(scraped.title), new Set(index.map((r) => r.id)));

  let hasImage = false;
  let coverExt: string | undefined;
  let coverUpdatedAt: string | undefined;

  if (scraped.imageUrl) {
    try {
      const imageRes = await fetch(scraped.imageUrl);
      if (imageRes.ok) {
        const buffer = Buffer.from(await imageRes.arrayBuffer());
        const contentType = imageRes.headers.get("content-type") ?? "image/jpeg";
        const ext = contentType.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
        await storage.put(`recipes/${id}/image.${ext}`, buffer, contentType);
        hasImage = true;
        coverExt = ext;
        coverUpdatedAt = new Date().toISOString();
      }
    } catch {
      // Photo download failing shouldn't block the import — the recipe is
      // still useful without a hero image, and it can be added manually.
    }
  }

  const ingredients: RecipeIngredient[] = scraped.ingredients.map((i) => ({
    id: crypto.randomUUID(),
    ...i,
  }));
  const steps: RecipeStep[] = scraped.steps.map((text) => ({
    id: crypto.randomUUID(),
    text,
    hasImage: false,
  }));

  const record: RecipeRecord = {
    id,
    title: scraped.title,
    source: scraped.source,
    sourceUrl: scraped.sourceUrl,
    description: scraped.description,
    servings: scraped.servings,
    prepMinutes: scraped.prepMinutes,
    cookMinutes: scraped.cookMinutes,
    cuisine: scraped.cuisine,
    tags: scraped.tags,
    ingredients,
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
