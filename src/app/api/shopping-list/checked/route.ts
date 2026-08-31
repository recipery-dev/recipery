import { NextResponse } from "next/server";
import { getActiveProfile } from "@/lib/profiles/store";
import { setCheckedOff } from "@/lib/shopping-list/store";

export async function PATCH(request: Request) {
  const profile = await getActiveProfile();
  const body = (await request.json().catch(() => ({}))) as { checkedOff?: string[] };
  if (!Array.isArray(body.checkedOff) || !body.checkedOff.every((v) => typeof v === "string")) {
    return NextResponse.json({ error: "checkedOff must be an array of strings" }, { status: 400 });
  }
  const shoppingList = await setCheckedOff(profile.id, body.checkedOff);
  return NextResponse.json({ shoppingList });
}
