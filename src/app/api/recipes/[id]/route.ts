import { NextResponse } from "next/server";
import { getActiveProfile } from "@/lib/profiles/store";
import { serviceErrorResponse } from "@/lib/recipes/http";
import { deleteRecipe, setRecipeState, type RecipeStatePatch } from "@/lib/recipes/service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as RecipeStatePatch;
  const profile = await getActiveProfile();
  try {
    return NextResponse.json({ recipe: await setRecipeState(profile.id, id, body) });
  } catch (error) {
    return serviceErrorResponse(error);
  }
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
  try {
    await deleteRecipe(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}
