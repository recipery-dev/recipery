import { NextResponse } from "next/server";
import { getActiveProfile } from "@/lib/profiles/store";
import { removeRecipeFromShoppingList } from "@/lib/shopping-list/store";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  const { recipeId } = await params;
  const profile = await getActiveProfile();
  const shoppingList = await removeRecipeFromShoppingList(profile.id, recipeId);
  return NextResponse.json({ shoppingList });
}
