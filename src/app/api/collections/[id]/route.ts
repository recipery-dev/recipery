import { NextResponse } from "next/server";
import { getActiveProfile } from "@/lib/profiles/store";
import { deleteCollection, updateCollection } from "@/lib/collections/store";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const profile = await getActiveProfile();
  const body = (await request.json().catch(() => ({}))) as { name?: string; color?: string };

  const patch: Partial<{ name: string; color: string }> = {};
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
  if (typeof body.color === "string") patch.color = body.color;

  const collection = await updateCollection(profile.id, id, patch);
  if (!collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }
  return NextResponse.json({ collection });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const profile = await getActiveProfile();
  await deleteCollection(profile.id, id);
  return NextResponse.json({ ok: true });
}
