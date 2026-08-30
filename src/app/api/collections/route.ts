import { NextResponse } from "next/server";
import { getActiveProfile } from "@/lib/profiles/store";
import { createCollection, listCollections } from "@/lib/collections/store";

export async function GET() {
  const profile = await getActiveProfile();
  const collections = await listCollections(profile.id);
  return NextResponse.json({ collections });
}

export async function POST(request: Request) {
  const profile = await getActiveProfile();
  const body = (await request.json().catch(() => ({}))) as { name?: string; color?: string };
  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const collection = await createCollection(profile.id, body.name, body.color);
  return NextResponse.json({ collection }, { status: 201 });
}
