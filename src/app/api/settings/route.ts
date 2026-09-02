import { NextResponse } from "next/server";
import { getSettings, updateSettings, type SettingsPatch } from "@/lib/settings/store";
import { toPublicSettings, parseDiscoverySources } from "@/lib/settings/types";
import { getActiveProfile } from "@/lib/profiles/store";

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({ settings: toPublicSettings(settings) });
}

export async function PATCH(request: Request) {
  const active = await getActiveProfile();
  if (active.role !== "admin") {
    return NextResponse.json(
      { error: "Only an admin can change these settings" },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as SettingsPatch;

  const patch: SettingsPatch = {};

  if (typeof body.recipesPerPage === "number") {
    const n = Math.round(body.recipesPerPage);
    if (n < 10 || n > 500) {
      return NextResponse.json(
        { error: "recipesPerPage must be between 10 and 500" },
        { status: 400 }
      );
    }
    patch.recipesPerPage = n;
  }

  if (typeof body.searchResultLimit === "number") {
    const n = Math.round(body.searchResultLimit);
    if (n < 1 || n > 100) {
      return NextResponse.json(
        { error: "searchResultLimit must be between 1 and 100" },
        { status: 400 }
      );
    }
    patch.searchResultLimit = n;
  }

  if (typeof body.imageMaxSizeMb === "number") {
    const n = Math.round(body.imageMaxSizeMb);
    if (n < 1 || n > 100) {
      return NextResponse.json(
        { error: "imageMaxSizeMb must be between 1 and 100" },
        { status: 400 }
      );
    }
    patch.imageMaxSizeMb = n;
  }

  if (typeof body.showIngredientGramHints === "boolean") {
    patch.showIngredientGramHints = body.showIngredientGramHints;
  }

  if (body.recipeDiscoverySources !== undefined) {
    const sources = parseDiscoverySources(body.recipeDiscoverySources);
    if (!sources) {
      return NextResponse.json(
        {
          error:
            "Each recipe discovery source needs a name, a valid http(s) search URL containing a \"{query}\" placeholder, and a valid http(s) browse URL if one is set",
        },
        { status: 400 }
      );
    }
    patch.recipeDiscoverySources = sources;
  }

  const settings = await updateSettings(patch);
  return NextResponse.json({ settings: toPublicSettings(settings) });
}
