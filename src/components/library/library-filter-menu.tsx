"use client";

import * as React from "react";
import { ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  collectRecipeCuisines,
  collectRecipeTags,
  isFiltersEmpty,
  EMPTY_RECIPE_FILTERS,
  type RecipeFilters,
} from "@/lib/recipes/filter";
import type { Recipe, RecipeDifficulty } from "@/lib/recipes/types";

const DIFFICULTY_LABELS: Record<RecipeDifficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

function toggled<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((v) => v !== item) : [...list, item];
}

interface LibraryFilterMenuProps {
  recipes: Recipe[];
  value: RecipeFilters;
  onChange: (filters: RecipeFilters) => void;
}

export function LibraryFilterMenu({ recipes, value, onChange }: LibraryFilterMenuProps) {
  const tags = React.useMemo(() => collectRecipeTags(recipes), [recipes]);
  const cuisines = React.useMemo(() => collectRecipeCuisines(recipes), [recipes]);
  const difficulties = React.useMemo(() => {
    const present = new Set(recipes.map((r) => r.difficulty).filter((d): d is RecipeDifficulty => !!d));
    return (["easy", "medium", "hard"] as const).filter((d) => present.has(d));
  }, [recipes]);

  if (tags.length === 0 && cuisines.length === 0 && difficulties.length === 0) return null;

  const activeCount = value.tags.length + value.cuisines.length + value.difficulties.length;

  const toggleTag = (tag: string) =>
    onChange({ ...value, tags: toggled(value.tags, tag) });
  const toggleCuisine = (cuisine: string) =>
    onChange({ ...value, cuisines: toggled(value.cuisines, cuisine) });
  const toggleDifficulty = (difficulty: RecipeDifficulty) =>
    onChange({ ...value, difficulties: toggled(value.difficulties, difficulty) });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" className="shrink-0 gap-1.5">
            <ListFilter className="size-3.5 shrink-0" />
            <span className="whitespace-nowrap">Filters</span>
            {activeCount > 0 && (
              <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                {activeCount}
              </Badge>
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        {tags.length > 0 && (
          <DropdownMenuGroup>
            <DropdownMenuLabel>Tags</DropdownMenuLabel>
            {tags.map((tag) => (
              <DropdownMenuCheckboxItem
                key={tag}
                checked={value.tags.includes(tag)}
                onCheckedChange={() => toggleTag(tag)}
              >
                {tag}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
        )}

        {cuisines.length > 0 && (
          <DropdownMenuGroup>
            {tags.length > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel>Cuisine</DropdownMenuLabel>
            {cuisines.map((cuisine) => (
              <DropdownMenuCheckboxItem
                key={cuisine}
                checked={value.cuisines.includes(cuisine)}
                onCheckedChange={() => toggleCuisine(cuisine)}
              >
                {cuisine}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
        )}

        {difficulties.length > 0 && (
          <DropdownMenuGroup>
            {(tags.length > 0 || cuisines.length > 0) && <DropdownMenuSeparator />}
            <DropdownMenuLabel>Difficulty</DropdownMenuLabel>
            {difficulties.map((difficulty) => (
              <DropdownMenuCheckboxItem
                key={difficulty}
                checked={value.difficulties.includes(difficulty)}
                onCheckedChange={() => toggleDifficulty(difficulty)}
              >
                {DIFFICULTY_LABELS[difficulty]}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
        )}

        {!isFiltersEmpty(value) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onChange(EMPTY_RECIPE_FILTERS)}>Clear filters</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
