import { NextResponse } from "next/server";
import { getActiveProfile, listProfiles } from "@/lib/profiles/store";
import { getProfileState } from "@/lib/profiles/state";

export interface RecipeActivity {
  profileId: string;
  name: string;
  color: string;
  cooked: boolean;
  rating?: number;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [profiles, active] = await Promise.all([listProfiles(), getActiveProfile()]);

  const activity: RecipeActivity[] = [];
  await Promise.all(
    profiles
      .filter((p) => p.id !== active.id)
      .map(async (p) => {
        const state = await getProfileState(p.id);
        const entry = state[id];
        if (!entry) return;
        const touched = entry.cooked || entry.rating !== undefined || entry.favorite;
        if (!touched) return;
        activity.push({
          profileId: p.id,
          name: p.name,
          color: p.color,
          cooked: !!entry.cooked,
          rating: entry.rating,
        });
      })
  );

  return NextResponse.json({ activity });
}
