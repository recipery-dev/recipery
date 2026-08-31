import { NextResponse } from "next/server";
import { getActiveProfile } from "@/lib/profiles/store";
import { addRecipeToShoppingList } from "@/lib/shopping-list/store";

export async function POST(request: Request) {
  const profile = await getActiveProfile();
  const body = (await request.json().catch(() => ({}))) as { recipeId?: string };
  if (!body.recipeId) {
    return NextResponse.json({ error: "recipeId is required" }, { status: 400 });
  }
  const shoppingList = await addRecipeToShoppingList(profile.id, body.recipeId);
  return NextResponse.json({ shoppingList });
}
