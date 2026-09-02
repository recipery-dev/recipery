"use client";

import * as React from "react";
import { ChefHat, Loader2, SearchX, Star } from "lucide-react";
import { DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { SideDrawer } from "@/components/side-drawer";
import { buildSimilarSearchQuery, type SimilarRecipeResult } from "@/lib/recipes/find-similar";
import { useLibraryShell } from "./library-shell-context";
import { FindSimilarPreviewDrawer } from "./find-similar-preview-drawer";
import type { Recipe } from "@/lib/recipes/types";

interface FindSimilarDrawerProps {
  recipe: Recipe;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FindSimilarDrawer({ recipe, open, onOpenChange }: FindSimilarDrawerProps) {
  const { settings } = useLibraryShell();
  const sources = settings.recipeDiscoverySources;
  const [results, setResults] = React.useState<SimilarRecipeResult[]>([]);
  const [status, setStatus] = React.useState<"loading" | "error" | "done">("loading");
  const [error, setError] = React.useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);

  const query = buildSimilarSearchQuery(recipe);

  // Fetches from every configured source in parallel and merges the
  // results — no per-source tabs, one combined list.
  React.useEffect(() => {
    if (!open || sources.length === 0) return;
    let cancelled = false;
    setStatus("loading");
    setResults([]);
    setError(null);
    fetch(`/api/recipes/similar?q=${encodeURIComponent(query)}`)
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "Couldn't search for similar recipes");
          setStatus("error");
          return;
        }
        setResults(data.results ?? []);
        setStatus("done");
      })
      .catch(() => {
        if (!cancelled) {
          setError("Couldn't search for similar recipes");
          setStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, sources.length, query]);

  const openPreview = (result: SimilarRecipeResult) => {
    setPreviewUrl(result.url);
    setPreviewOpen(true);
  };

  return (
    <SideDrawer open={open} onOpenChange={onOpenChange} modal={false}>
      <DrawerHeader>
        <DrawerTitle>Find Similar</DrawerTitle>
        <DrawerDescription className="pb-2">Results for &ldquo;{query}&rdquo;</DrawerDescription>
      </DrawerHeader>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pb-4">
        {sources.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <SearchX className="size-6 text-muted-foreground/40" strokeWidth={1.5} />
            <p className="px-4 text-sm text-muted-foreground">
              No recipe discovery sources are configured — add one in Settings &rarr; Recipe Discovery.
            </p>
          </div>
        ) : status === "loading" ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Searching…</p>
          </div>
        ) : status === "error" ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <SearchX className="size-6 text-muted-foreground/40" strokeWidth={1.5} />
            <p className="px-4 text-sm text-muted-foreground">{error}</p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <SearchX className="size-6 text-muted-foreground/40" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground">No matches for &ldquo;{query}&rdquo;</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {results.map((result) => (
              <li key={result.id} className="flex items-center gap-1 rounded-lg hover:bg-accent">
                <button
                  type="button"
                  onClick={() => openPreview(result)}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-3 text-left"
                >
                  <div className="w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                    {result.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={result.imageUrl} alt="" className="aspect-square w-full object-cover" />
                    ) : (
                      <div className="flex aspect-square w-full items-center justify-center">
                        <ChefHat className="size-4 text-foreground/15" strokeWidth={1.5} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{result.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {result.time ?? "Recipe"}
                      {result.rating !== undefined && (
                        <span className="ml-1.5 inline-flex items-center gap-0.5">
                          <Star className="size-3 fill-current" />
                          {result.rating.toFixed(1)}
                        </span>
                      )}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <FindSimilarPreviewDrawer
        url={previewUrl}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onImported={() => onOpenChange(false)}
      />
    </SideDrawer>
  );
}
