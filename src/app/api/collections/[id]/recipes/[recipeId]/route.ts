import { NextResponse } from "next/server";
import { getActiveProfile } from "@/lib/profiles/store";
import { removeRecipeFromCollection } from "@/lib/collections/store";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; recipeId: string }> }
) {
  const { id, recipeId } = await params;
  const profile = await getActiveProfile();
  const collections = await removeRecipeFromCollection(profile.id, id, recipeId);
  return NextResponse.json({ collections });
}
