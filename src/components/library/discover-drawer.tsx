"use client";

import * as React from "react";
import { ExternalLink, Loader2, Search, SearchX, Star } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buildSimilarSearchUrl, type SimilarRecipeResult } from "@/lib/recipes/find-similar";
import { useLibraryShell } from "./library-shell-context";
import { FindSimilarPreviewDrawer } from "./find-similar-preview-drawer";

interface DiscoverDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DiscoverDrawer({ open, onOpenChange }: DiscoverDrawerProps) {
  const { settings } = useLibraryShell();
  const sources = settings.recipeDiscoverySources;
  const [sourceId, setSourceId] = React.useState(sources[0]?.id);
  const [query, setQuery] = React.useState("");
  const [submittedQuery, setSubmittedQuery] = React.useState("");
  const [results, setResults] = React.useState<SimilarRecipeResult[]>([]);
  const [status, setStatus] = React.useState<"idle" | "loading" | "error" | "done">("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const source = sources.find((s) => s.id === sourceId) ?? sources[0];

  // Fresh state each time the drawer opens.
  React.useEffect(() => {
    if (!open) return;
    setSourceId(sources[0]?.id);
    setQuery("");
    setSubmittedQuery("");
    setResults([]);
    setStatus("idle");
    setError(null);
    requestAnimationFrame(() => inputRef.current?.focus());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  React.useEffect(() => {
    if (!open || !source || !submittedQuery) return;
    let cancelled = false;
    setStatus("loading");
    setResults([]);
    setError(null);
    fetch(`/api/recipes/similar?sourceId=${encodeURIComponent(source.id)}&q=${encodeURIComponent(submittedQuery)}`)
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
  }, [open, source, submittedQuery]);

  const handleSubmit = () => {
    const trimmed = query.trim();
    if (trimmed) setSubmittedQuery(trimmed);
  };

  const openPreview = (result: SimilarRecipeResult) => {
    setPreviewUrl(result.url);
    setPreviewOpen(true);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} modal={false} swipeDirection="right" showSwipeHandle>
      <DrawerContent className="my-3 border-t border-b data-[swipe-axis=x]:[--drawer-content-width:94vw]! data-[swipe-axis=x]:sm:[--drawer-content-width:min(36rem,92vw)]!">
        <DrawerHeader>
          <DrawerTitle>Discover</DrawerTitle>
          <DrawerDescription className="pb-2">Search recipe sites for something new to cook</DrawerDescription>
        </DrawerHeader>

        <div className="flex shrink-0 items-center gap-2 px-4 pb-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            placeholder="e.g. beef stew, weeknight pasta…"
          />
          <Button size="sm" disabled={!query.trim()} onClick={handleSubmit}>
            Search
          </Button>
        </div>

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
              {status === "idle" ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                  <Search className="size-6 text-muted-foreground/40" strokeWidth={1.5} />
                  <p className="text-sm text-muted-foreground">Type something to search {source.name}.</p>
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    render={
                      <a
                        href={buildSimilarSearchUrl(source.searchUrlTemplate, submittedQuery)}
                        target="_blank"
                        rel="noopener noreferrer"
                      />
                    }
                  >
                    <ExternalLink className="size-3.5" />
                    Open search on {source.name}
                  </Button>
                </div>
              ) : results.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                  <SearchX className="size-6 text-muted-foreground/40" strokeWidth={1.5} />
                  <p className="text-sm text-muted-foreground">No matches for &ldquo;{submittedQuery}&rdquo;</p>
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
                            <div className="aspect-square w-full" />
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
      </DrawerContent>
    </Drawer>
  );
}
