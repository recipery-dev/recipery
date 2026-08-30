import { NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { mutateJson, readJson } from "@/lib/store";
import { getActiveProfile, listProfiles } from "@/lib/profiles/store";
import {
  applyProfileState,
  deleteProfileRecipeState,
  updateProfileRecipeState,
  type ProfileRecipeState,
} from "@/lib/profiles/state";
import type { RecipeRecord } from "@/lib/recipes/types";

interface UpdateRecipeBody {
  rating?: number;
  favorite?: boolean;
  cooked?: boolean;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const recipe = await readJson<RecipeRecord>(`recipes/${id}/metadata.json`);
  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as UpdateRecipeBody;

  const patch: Partial<ProfileRecipeState> = {};
  if (body.rating !== undefined) {
    if (
      typeof body.rating !== "number" ||
      !Number.isInteger(body.rating) ||
      body.rating < 0 ||
      body.rating > 5
    ) {
      return NextResponse.json({ error: "rating must be an integer 0-5" }, { status: 400 });
    }
    patch.rating = body.rating === 0 ? undefined : body.rating;
  }
  if (body.favorite !== undefined) {
    patch.favorite = !!body.favorite;
  }
  if (body.cooked !== undefined) {
    patch.cooked = !!body.cooked;
    if (body.cooked) patch.lastCookedAt = new Date().toISOString();
  }

  const profile = await getActiveProfile();
  const state = await updateProfileRecipeState(profile.id, id, patch);

  return NextResponse.json({ recipe: applyProfileState(recipe, state) });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const activeProfile = await getActiveProfile();
  if (activeProfile.role !== "admin") {
    return NextResponse.json(
      { error: "Only an admin can delete recipes" },
      { status: 403 }
    );
  }

  const { id } = await params;
  const recipe = await readJson<RecipeRecord>(`recipes/${id}/metadata.json`);
  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const storage = getStorage();
  const keys = await storage.list(`recipes/${id}/`);
  await Promise.all(keys.map((key) => storage.delete(key)));

  await mutateJson<RecipeRecord[]>("index.json", (current) =>
    (current ?? []).filter((r) => r.id !== id)
  );

  const profiles = await listProfiles();
  await Promise.all(profiles.map((p) => deleteProfileRecipeState(p.id, id)));

  return NextResponse.json({ ok: true });
}
