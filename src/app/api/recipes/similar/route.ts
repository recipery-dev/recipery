import { NextResponse } from "next/server";
import { searchRecipeSource } from "@/lib/recipes/find-similar";
import { getSettings } from "@/lib/settings/store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "A search query is required" }, { status: 400 });
  }

  const settings = await getSettings();
  const sourceId = searchParams.get("sourceId");
  const source =
    settings.recipeDiscoverySources.find((s) => s.id === sourceId) ?? settings.recipeDiscoverySources[0];
  if (!source) {
    return NextResponse.json(
      { error: "No recipe discovery sources are configured — add one in Settings." },
      { status: 400 }
    );
  }

  try {
    const results = await searchRecipeSource(source, q);
    return NextResponse.json({ results, source });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message, source }, { status: 502 });
  }
}
