"use client";

import { ArrowDownUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RECIPE_SORT_OPTIONS, type RecipeSort } from "@/lib/recipes/sort";

interface LibrarySortMenuProps {
  value: RecipeSort;
  onChange: (sort: RecipeSort) => void;
}

export function LibrarySortMenu({ value, onChange }: LibrarySortMenuProps) {
  const current = RECIPE_SORT_OPTIONS.find((o) => o.id === value) ?? RECIPE_SORT_OPTIONS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" className="shrink-0 gap-1.5">
            <ArrowDownUp className="size-3.5 shrink-0" />
            <span className="whitespace-nowrap">{current.label}</span>
          </Button>
        }
      />
      {/* Fixed width, independent of the trigger — the popup defaults to
          w-(--anchor-width), so it would otherwise shrink to match a short
          trigger label and wrap longer options inside itself. */}
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(v) => onChange(v as RecipeSort)}
        >
          {RECIPE_SORT_OPTIONS.map((opt) => (
            <DropdownMenuRadioItem key={opt.id} value={opt.id} closeOnClick>
              {opt.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
