import { NextResponse } from "next/server";
import { searchAllSources, browseAllSources } from "@/lib/recipes/find-similar";
import { getSettings } from "@/lib/settings/store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  const settings = await getSettings();
  const sources = settings.recipeDiscoverySources;
  if (sources.length === 0) {
    return NextResponse.json(
      { error: "No recipe discovery sources are configured — add one in Settings." },
      { status: 400 }
    );
  }

  // Fans out to every configured source in parallel and merges the results —
  // both Discover and Find Similar show one unified feed, not per-source tabs.
  const { results, failedSources } = q ? await searchAllSources(sources, q) : await browseAllSources(sources);

  if (results.length === 0 && failedSources.length > 0) {
    return NextResponse.json(
      { error: `Couldn't load recipes — ${failedSources.join(", ")} didn't respond.` },
      { status: 502 }
    );
  }

  return NextResponse.json({ results });
}
