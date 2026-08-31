"use client";

import * as React from "react";
import { BookOpen, ChefHat, FolderOpen, Heart, Star, Users } from "lucide-react";
import { useLibraryShell } from "@/components/library/library-shell-context";

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="font-heading text-lg font-bold leading-none">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function StatsPanel() {
  const { recipes, collections, profiles } = useLibraryShell();

  const { favorites, cooked, avgRating } = React.useMemo(() => {
    const rated = recipes.filter((r) => r.rating);
    return {
      favorites: recipes.filter((r) => r.favorite).length,
      cooked: recipes.filter((r) => r.cooked).length,
      avgRating: rated.length
        ? (rated.reduce((sum, r) => sum + (r.rating ?? 0), 0) / rated.length).toFixed(1)
        : null,
    };
  }, [recipes]);

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border p-5">
        <h2 className="font-heading text-base font-bold">Stats</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">A quick look at your library.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3">
        <StatTile icon={BookOpen} label="Recipes" value={String(recipes.length)} />
        <StatTile icon={FolderOpen} label="Collections" value={String(collections.length)} />
        <StatTile icon={Users} label="Profiles" value={String(profiles.length)} />
        <StatTile icon={Heart} label="Favorited" value={String(favorites)} />
        <StatTile icon={ChefHat} label="Cooked" value={String(cooked)} />
        <StatTile icon={Star} label="Avg rating" value={avgRating ?? "—"} />
      </div>
    </div>
  );
}
