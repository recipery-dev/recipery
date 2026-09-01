import { NextResponse } from "next/server";
import { getSettings, updateSettings, type SettingsPatch } from "@/lib/settings/store";
import { toPublicSettings } from "@/lib/settings/types";
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

  if (Array.isArray(body.recipeDiscoverySources)) {
    const sources = body.recipeDiscoverySources;
    const valid = sources.every((s) => {
      if (typeof s !== "object" || s === null) return false;
      const { id, name, searchUrlTemplate } = s as unknown as Record<string, unknown>;
      if (typeof id !== "string" || !id.trim()) return false;
      if (typeof name !== "string" || !name.trim()) return false;
      if (typeof searchUrlTemplate !== "string" || !searchUrlTemplate.includes("{query}")) return false;
      try {
        const parsed = new URL(searchUrlTemplate.replace("{query}", "x"));
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
      } catch {
        return false;
      }
      return true;
    });
    if (!valid) {
      return NextResponse.json(
        {
          error:
            "Each recipe discovery source needs a name and a valid http(s) URL containing a \"{query}\" placeholder",
        },
        { status: 400 }
      );
    }
    patch.recipeDiscoverySources = sources.map((s) => ({
      id: s.id.trim(),
      name: s.name.trim(),
      searchUrlTemplate: s.searchUrlTemplate.trim(),
    }));
  }

  const settings = await updateSettings(patch);
  return NextResponse.json({ settings: toPublicSettings(settings) });
}
