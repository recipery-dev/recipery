"use client";

import * as React from "react";
import { ChefHat, SearchX, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { RecipeGridLayout } from "@/components/library/recipe-grid";
import { recipeTileClassName } from "@/components/library/recipe-tile";
import type { SimilarRecipeResult } from "@/lib/recipes/find-similar";
import { useLibraryShell } from "./library-shell-context";
import { FindSimilarPreviewDrawer } from "./find-similar-preview-drawer";

// A plain <img> tile rather than the app's `RecipeTile`/`RecipePhoto` —
// those go through next/image, which requires every image host to be
// allowlisted in next.config.ts. Discover results come from arbitrary
// external sites (NYT, BBC, or any custom source an admin adds), so their
// photos can't go through the optimizer.
function DiscoverResultTile({ result }: { result: SimilarRecipeResult }) {
  return (
    <>
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
        {result.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={result.imageUrl} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center">
            <ChefHat className="size-8 text-foreground/15" strokeWidth={1.5} />
          </div>
        )}
        {result.rating !== undefined && (
          <div className="absolute right-1.5 bottom-1.5 flex items-center gap-0.5 rounded-full bg-black/70 px-1.5 py-0.5 text-xs text-white">
            <Star className="size-3 fill-current" />
            {result.rating.toFixed(1)}
          </div>
        )}
      </div>
      <p className="mt-3 line-clamp-1 text-sm font-semibold">{result.title}</p>
      {result.time && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{result.time}</p>}
    </>
  );
}

// A skeleton grid instead of a plain spinner while results load — each
// tile pulses in a staggered wave rather than all at once, so it reads as
// "still working" rather than a single frozen frame.
function DiscoverGridSkeleton() {
  return (
    <RecipeGridLayout>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="w-full p-2 sm:w-56 sm:shrink-0">
          <Skeleton
            className="aspect-[4/3] w-full rounded-lg"
            style={{ animationDelay: `${(i % 5) * 75}ms` }}
          />
          <Skeleton className="mt-3 h-3.5 w-4/5 rounded" style={{ animationDelay: `${(i % 5) * 75}ms` }} />
          <Skeleton className="mt-2 h-3 w-2/5 rounded" style={{ animationDelay: `${(i % 5) * 75}ms` }} />
        </div>
      ))}
    </RecipeGridLayout>
  );
}

// Fixed, curated quick-search shortcuts — not true filters (the scraped
// results carry no diet/protein/ingredient data to filter by), just common
// terms that fill the search box and run a real search when tapped.
const DISCOVER_CATEGORIES = [
  "Chicken",
  "Beef",
  "Pork",
  "Fish",
  "Vegetarian",
  "Vegan",
  "Pasta",
  "Soup",
  "Salad",
  "Dessert",
  "Breakfast",
];

export function DiscoverPage() {
  const { settings, discoverSubmittedQuery: submittedQuery, submitDiscoverQuery } = useLibraryShell();
  const sources = settings.recipeDiscoverySources;
  const [results, setResults] = React.useState<SimilarRecipeResult[]>([]);
  const [status, setStatus] = React.useState<"loading" | "error" | "done">("loading");
  const [error, setError] = React.useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);

  // Fetches from every configured source and merges the results — no
  // per-source tabs, one unified feed. Runs immediately on load (no query
  // yet = the sources' own default/sorted listings) and again on every
  // search.
  React.useEffect(() => {
    if (sources.length === 0) return;
    let cancelled = false;
    setStatus("loading");
    setResults([]);
    setError(null);
    const params = new URLSearchParams();
    if (submittedQuery) params.set("q", submittedQuery);
    fetch(`/api/recipes/similar?${params}`)
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "Couldn't load recipes");
          setStatus("error");
          return;
        }
        setResults(data.results ?? []);
        setStatus("done");
      })
      .catch(() => {
        if (!cancelled) {
          setError("Couldn't load recipes");
          setStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submittedQuery]);

  const openPreview = (result: SimilarRecipeResult) => {
    setPreviewUrl(result.url);
    setPreviewOpen(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-bold tracking-tight">Discover</h2>

        {sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {DISCOVER_CATEGORIES.map((category) => (
              <Button
                key={category}
                type="button"
                variant={submittedQuery === category ? "default" : "outline"}
                size="sm"
                onClick={() => submitDiscoverQuery(category)}
              >
                {category}
              </Button>
            ))}
          </div>
        )}
      </div>

      {sources.length === 0 ? (
        <Empty className="border py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX strokeWidth={1.75} />
            </EmptyMedia>
            <EmptyTitle>No recipe discovery sources configured</EmptyTitle>
            <EmptyDescription>Add one in Settings → Recipe Discovery.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : status === "loading" ? (
        <DiscoverGridSkeleton />
      ) : status === "error" ? (
        <Empty className="border py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX strokeWidth={1.75} />
            </EmptyMedia>
            <EmptyTitle>{error}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : results.length === 0 ? (
        <Empty className="border py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX strokeWidth={1.75} />
            </EmptyMedia>
            <EmptyTitle>
              {submittedQuery ? `No matches for “${submittedQuery}”` : "No recipes to show yet"}
            </EmptyTitle>
            {!submittedQuery && (
              <EmptyDescription>
                None of your discovery sources have a browse listing configured — try searching instead.
              </EmptyDescription>
            )}
          </EmptyHeader>
        </Empty>
      ) : (
        <RecipeGridLayout>
          {results.map((result, i) => (
            <button
              key={result.id}
              type="button"
              onClick={() => openPreview(result)}
              className={recipeTileClassName()}
              style={{ animationDelay: `${Math.min(i, 20) * 25}ms` }}
            >
              <DiscoverResultTile result={result} />
            </button>
          ))}
        </RecipeGridLayout>
      )}

      <FindSimilarPreviewDrawer url={previewUrl} open={previewOpen} onOpenChange={setPreviewOpen} />
    </div>
  );
}
