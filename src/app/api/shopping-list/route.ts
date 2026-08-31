import { NextResponse } from "next/server";
import { getActiveProfile } from "@/lib/profiles/store";
import { clearShoppingList, getShoppingList } from "@/lib/shopping-list/store";

export async function GET() {
  const profile = await getActiveProfile();
  const shoppingList = await getShoppingList(profile.id);
  return NextResponse.json({ shoppingList });
}

export async function DELETE() {
  const profile = await getActiveProfile();
  const shoppingList = await clearShoppingList(profile.id);
  return NextResponse.json({ shoppingList });
}
