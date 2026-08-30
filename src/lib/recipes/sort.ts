import { totalMinutes, type Recipe } from "./types";

export type RecipeSort = "recent" | "recently-cooked" | "title" | "rating" | "cooked" | "quickest";

export const RECIPE_SORT_OPTIONS: { id: RecipeSort; label: string }[] = [
  { id: "recent", label: "Recently added" },
  { id: "recently-cooked", label: "Recently cooked" },
  { id: "title", label: "Title (A–Z)" },
  { id: "rating", label: "Highest rated" },
  { id: "cooked", label: "Cooked first" },
  { id: "quickest", label: "Quickest to make" },
];

export function sortRecipes(recipes: Recipe[], sort: RecipeSort): Recipe[] {
  const sorted = [...recipes];
  switch (sort) {
    case "recent":
      return sorted.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
    case "recently-cooked":
      return sorted.sort((a, b) => (b.lastCookedAt ?? "").localeCompare(a.lastCookedAt ?? ""));
    case "title":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "rating":
      return sorted.sort(
        (a, b) => (b.rating ?? 0) - (a.rating ?? 0) || a.title.localeCompare(b.title)
      );
    case "cooked":
      return sorted.sort(
        (a, b) => Number(b.cooked ?? false) - Number(a.cooked ?? false) || a.title.localeCompare(b.title)
      );
    case "quickest":
      return sorted.sort((a, b) => {
        const ta = totalMinutes(a);
        const tb = totalMinutes(b);
        if (ta === undefined && tb === undefined) return a.title.localeCompare(b.title);
        if (ta === undefined) return 1;
        if (tb === undefined) return -1;
        return ta - tb || a.title.localeCompare(b.title);
      });
  }
}
