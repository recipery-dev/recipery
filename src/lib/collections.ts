export interface Collection {
  id: string;
  name: string;
  color: string;
  recipeIds: string[];
}

export const COLLECTION_COLORS = [
  "bg-blue-500",
  "bg-fuchsia-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-violet-500",
  "bg-orange-500",
  "bg-teal-500",
  "bg-slate-500",
];

export function nextCollectionColor(existingCount: number): string {
  return COLLECTION_COLORS[existingCount % COLLECTION_COLORS.length];
}
