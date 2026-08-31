"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight, ChefHat } from "lucide-react";
import { RecipeCard, type RecipeCardActions } from "./recipe-card";
import { useLibraryShell } from "./library-shell-context";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import type { Recipe } from "@/lib/recipes/types";

/** Grid wrapper shared by every view that lays out recipe tiles (library, favorites, collections). */
export function RecipeGridLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
      {children}
    </div>
  );
}

interface RecipeGridProps {
  title: string;
  recipes: Recipe[];
  selectedId?: string;
  onSelect: (recipe: Recipe) => void;
  actions: RecipeCardActions;
  emptyIcon?: React.ElementType;
  emptyTitle: string;
  emptyMessage: string;
  /** Extra controls shown next to the title, e.g. a sort menu. */
  titleActions?: React.ReactNode;
}

export function RecipeGrid({
  title,
  recipes,
  selectedId,
  onSelect,
  actions,
  emptyIcon: EmptyIcon = ChefHat,
  emptyTitle,
  emptyMessage,
  titleActions,
}: RecipeGridProps) {
  const { settings } = useLibraryShell();
  const [page, setPage] = React.useState(1);
  const perPage = settings.recipesPerPage;
  const totalPages = Math.max(1, Math.ceil(recipes.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * perPage;
  const pageRecipes = recipes.slice(start, start + perPage);

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="min-w-0 truncate font-heading text-lg font-bold tracking-tight">
          {title}
        </h2>
        {titleActions}
      </div>
      {recipes.length === 0 ? (
        <Empty className="border py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <EmptyIcon strokeWidth={1.75} />
            </EmptyMedia>
            <EmptyTitle>{emptyTitle}</EmptyTitle>
            <EmptyDescription>{emptyMessage}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <RecipeGridLayout>
            {pageRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                selected={recipe.id === selectedId}
                onSelect={onSelect}
                actions={actions}
              />
            ))}
          </RecipeGridLayout>
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage <= 1}
                aria-label="Previous page"
                className="group flex size-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              >
                <ArrowLeft className="size-5 transition-transform duration-200 ease-out group-hover:-translate-x-px" />
              </button>
              <span className="text-sm text-muted-foreground">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                aria-label="Next page"
                className="group flex size-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              >
                <ArrowRight className="size-5 transition-transform duration-200 ease-out group-hover:translate-x-px" />
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
