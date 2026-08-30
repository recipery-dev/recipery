import { NextResponse } from "next/server";
import { getActiveProfile } from "@/lib/profiles/store";
import { addRecipeToCollection } from "@/lib/collections/store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const profile = await getActiveProfile();
  const body = (await request.json().catch(() => ({}))) as { recipeId?: string };
  if (!body.recipeId) {
    return NextResponse.json({ error: "recipeId is required" }, { status: 400 });
  }
  const collections = await addRecipeToCollection(profile.id, id, body.recipeId);
  return NextResponse.json({ collections });
}
