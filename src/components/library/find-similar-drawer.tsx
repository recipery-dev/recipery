"use client";

import * as React from "react";
import { ChefHat, ExternalLink, Loader2, SearchX, Star } from "lucide-react";
import { DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { SideDrawer } from "@/components/side-drawer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buildSimilarSearchQuery, buildSimilarSearchUrl, type SimilarRecipeResult } from "@/lib/recipes/find-similar";
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
    setPreviewUrl(result.url);
    setPreviewOpen(true);
  };

  return (
    <SideDrawer open={open} onOpenChange={onOpenChange} modal={false}>
      <DrawerHeader>
        <DrawerTitle>Find Similar</DrawerTitle>
        <DrawerDescription className="pb-2">Results for &ldquo;{query}&rdquo;</DrawerDescription>
      </DrawerHeader>

      {sources.length === 0 ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <SearchX className="size-6 text-muted-foreground/40" strokeWidth={1.5} />
            <p className="px-4 text-sm text-muted-foreground">
              No recipe discovery sources are configured — add one in Settings &rarr; Recipe Discovery.
            </p>
          </div>
        </div>
      ) : (
        <Tabs
          value={sourceId}
          onValueChange={(value) => setSourceId(value as string)}
          className="flex min-h-0 flex-1 flex-col gap-0"
        >
          {sources.length > 1 && (
            <TabsList className="mx-4 mb-3 w-auto shrink-0 justify-start overflow-x-auto">
              {sources.map((s) => (
                <TabsTrigger key={s.id} value={s.id}>
                  {s.name}
                </TabsTrigger>
              ))}
            </TabsList>
          )}

          <TabsContent value={sourceId} className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pb-4">
            {status === "loading" ? (
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
          </TabsContent>
        </Tabs>
      )}

      <FindSimilarPreviewDrawer
        url={previewUrl}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onImported={() => onOpenChange(false)}
      />
    </SideDrawer>
  );
}
