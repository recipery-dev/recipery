"use client";

import * as React from "react";
import { ExternalLink, Loader2, SearchX, Star } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { buildSimilarSearchQuery, buildSimilarSearchUrl, type SimilarRecipeResult } from "@/lib/recipes/find-similar";
import { useLibraryShell } from "./library-shell-context";
import { FindSimilarPreviewDrawer } from "./find-similar-preview-drawer";
import { cn } from "@/lib/utils";
import type { Recipe } from "@/lib/recipes/types";

interface FindSimilarDrawerProps {
  recipe: Recipe;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FindSimilarDrawer({ recipe, open, onOpenChange }: FindSimilarDrawerProps) {
  const { settings } = useLibraryShell();
  const sources = settings.recipeDiscoverySources;
  const [sourceId, setSourceId] = React.useState(sources[0]?.id);
  const [results, setResults] = React.useState<SimilarRecipeResult[]>([]);
  const [status, setStatus] = React.useState<"loading" | "error" | "done">("loading");
  const [error, setError] = React.useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);

  const query = buildSimilarSearchQuery(recipe);
  const source = sources.find((s) => s.id === sourceId) ?? sources[0];

  // Reset to the first source each time the drawer opens for a recipe.
  React.useEffect(() => {
    if (open) setSourceId(sources[0]?.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, recipe.id]);

  React.useEffect(() => {
    if (!open || !source) return;
    let cancelled = false;
    setStatus("loading");
    setResults([]);
    setError(null);
    fetch(`/api/recipes/similar?sourceId=${encodeURIComponent(source.id)}&q=${encodeURIComponent(query)}`)
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? `Couldn't search ${source.name}`);
          setStatus("error");
          return;
        }
        setResults(data.results ?? []);
        setStatus("done");
      })
      .catch(() => {
        if (!cancelled) {
          setError(`Couldn't search ${source.name}`);
          setStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, source, query]);

  const openPreview = (result: SimilarRecipeResult) => {
    if (result.type !== "recipe") return;
    setPreviewUrl(result.url);
    setPreviewOpen(true);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} modal={false} swipeDirection="right">
      <DrawerContent className="my-3 border-t border-b data-[swipe-axis=x]:[--drawer-content-width:94vw]! data-[swipe-axis=x]:sm:[--drawer-content-width:min(36rem,92vw)]!">
        <DrawerHeader>
          <DrawerTitle>Find Similar</DrawerTitle>
          <DrawerDescription className="pb-2">Results for &ldquo;{query}&rdquo;</DrawerDescription>
        </DrawerHeader>

        {sources.length > 1 && (
          <div className="flex shrink-0 gap-1 overflow-x-auto px-4 pb-3">
            {sources.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSourceId(s.id)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
                  s.id === source?.id
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                )}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pb-4">
          {!source ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <SearchX className="size-6 text-muted-foreground/40" strokeWidth={1.5} />
              <p className="px-4 text-sm text-muted-foreground">
                No recipe discovery sources are configured — add one in Settings &rarr; Recipe Discovery.
              </p>
            </div>
          ) : status === "loading" ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Searching {source.name}…</p>
            </div>
          ) : status === "error" ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <SearchX className="size-6 text-muted-foreground/40" strokeWidth={1.5} />
              <p className="px-4 text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" className="gap-1.5" render={
                <a href={buildSimilarSearchUrl(source.searchUrlTemplate, query)} target="_blank" rel="noopener noreferrer" />
              }>
                <ExternalLink className="size-3.5" />
                Open search on {source.name}
              </Button>
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
                    disabled={result.type !== "recipe"}
                    onClick={() => openPreview(result)}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-3 text-left disabled:cursor-default"
                  >
                    <div className="w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                      {result.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={result.imageUrl} alt="" className="aspect-square w-full object-cover" />
                      ) : (
                        <div className="aspect-square w-full" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{result.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {result.type === "article" ? "Article" : (result.time ?? "Recipe")}
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
      </DrawerContent>
    </Drawer>
  );
}
