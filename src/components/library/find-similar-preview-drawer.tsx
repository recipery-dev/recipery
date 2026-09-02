"use client";

import * as React from "react";
import { Clock, ExternalLink, Loader2, SearchX } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useLibraryShell } from "./library-shell-context";
import type { ScrapedRecipe } from "@/lib/recipes/scrape";

interface FindSimilarPreviewDrawerProps {
  url: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful import — lets the caller close any drawers stacked above this one too. */
  onImported?: () => void;
}

export function FindSimilarPreviewDrawer({ url, open, onOpenChange, onImported }: FindSimilarPreviewDrawerProps) {
  const { importing, importFromUrl } = useLibraryShell();
  const [recipe, setRecipe] = React.useState<ScrapedRecipe | null>(null);
  const [status, setStatus] = React.useState<"loading" | "error" | "done">("loading");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open || !url) return;
    let cancelled = false;
    setStatus("loading");
    setRecipe(null);
    setError(null);
    fetch(`/api/recipes/preview?url=${encodeURIComponent(url)}`)
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "Couldn't load that recipe");
          setStatus("error");
          return;
        }
        setRecipe(data.recipe as ScrapedRecipe);
        setStatus("done");
      })
      .catch(() => {
        if (!cancelled) {
          setError("Couldn't load that recipe");
          setStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, url]);

  const handleImport = async () => {
    if (!url) return;
    await importFromUrl(url);
    onOpenChange(false);
    onImported?.();
  };

  const totalMin =
    recipe?.prepMinutes !== undefined || recipe?.cookMinutes !== undefined
      ? (recipe?.prepMinutes ?? 0) + (recipe?.cookMinutes ?? 0)
      : undefined;

  return (
    <Drawer open={open} onOpenChange={onOpenChange} modal={false} swipeDirection="right" showSwipeHandle>
      <DrawerContent className="my-3 border-t border-b data-[swipe-axis=x]:[--drawer-content-width:94vw]! data-[swipe-axis=x]:sm:[--drawer-content-width:min(36rem,92vw)]!">
        <DrawerHeader>
          <DrawerTitle>Preview</DrawerTitle>
          <DrawerDescription className="pb-2">Not added to your library yet</DrawerDescription>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pb-4">
          {status === "loading" ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Fetching recipe…</p>
            </div>
          ) : status === "error" ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <SearchX className="size-6 text-muted-foreground/40" strokeWidth={1.5} />
              <p className="px-2 text-sm text-muted-foreground">{error}</p>
              {url && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  render={<a href={url} target="_blank" rel="noopener noreferrer" />}
                >
                  <ExternalLink className="size-3.5" />
                  Open original page
                </Button>
              )}
            </div>
          ) : recipe ? (
            <div className="flex flex-col gap-4">
              {recipe.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={recipe.imageUrl}
                  alt=""
                  className="aspect-video w-full rounded-xl border border-border object-cover"
                />
              )}
              <div>
                <h2 className="font-heading text-lg font-bold leading-snug text-balance">{recipe.title}</h2>
                {recipe.source && <p className="text-sm text-muted-foreground">{recipe.source}</p>}
                {totalMin !== undefined && (
                  <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="size-3.5" />
                    {recipe.prepMinutes !== undefined && `${recipe.prepMinutes} min prep`}
                    {recipe.prepMinutes !== undefined && recipe.cookMinutes !== undefined && " · "}
                    {recipe.cookMinutes !== undefined && `${recipe.cookMinutes} min cook`}
                  </span>
                )}
                {(recipe.tags.length > 0 || recipe.cuisine) && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {recipe.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                    {recipe.cuisine && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {recipe.cuisine}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {recipe.description && (
                <p className="text-sm leading-relaxed text-muted-foreground">{recipe.description}</p>
              )}

              {recipe.ingredients.length > 0 && (
                <div>
                  <h3 className="font-heading text-sm font-bold">Ingredients</h3>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {recipe.ingredients.map((ing, i) => (
                      <li key={i} className="text-sm">
                        {[ing.quantity, ing.unit, ing.name].filter(Boolean).join(" ")}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {recipe.steps.length > 0 && (
                <div>
                  <h3 className="font-heading text-sm font-bold">Steps</h3>
                  <ol className="mt-2 flex flex-col gap-3">
                    {recipe.steps.map((step, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                          {i + 1}
                        </span>
                        <p className="text-sm leading-relaxed">{step}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <DrawerFooter className="sm:flex-row sm:justify-end pt-4">
          <DrawerClose render={<Button variant="outline">Close</Button>} />
          <Button onClick={handleImport} disabled={status !== "done" || importing} className="gap-2">
            {importing && <Loader2 className="size-4 animate-spin" />}
            Import
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
