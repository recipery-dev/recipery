import { ChefHat, Clock } from "lucide-react";
import { RecipePhoto } from "./recipe-photo";
import { Button } from "@/components/ui/button";
import { totalMinutes, type Recipe } from "@/lib/recipes/types";

interface RecentlyCookedProps {
  recipe: Recipe;
  onSelect: (recipe: Recipe) => void;
}

export function RecentlyCooked({ recipe, onSelect }: RecentlyCookedProps) {
  const minutes = totalMinutes(recipe);

  return (
    <section>
      <h2 className="mb-4 font-heading text-lg font-bold tracking-tight">
        Recently Cooked
      </h2>
      <div className="flex gap-3 rounded-xl border border-border bg-card p-3 sm:gap-5 sm:p-5">
        <RecipePhoto title={recipe.title} coverUrl={recipe.coverUrl} className="w-28 sm:w-40" />
        <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
          <div>
            <h3 className="font-heading text-lg font-bold leading-snug text-balance">
              {recipe.title}
            </h3>
            {recipe.source && <p className="mt-1 text-sm text-muted-foreground">{recipe.source}</p>}
            {minutes !== undefined && (
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  {minutes} min
                </span>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 sm:gap-4">
            <Button className="rounded-full gap-2" size="sm" onClick={() => onSelect(recipe)}>
              <ChefHat className="size-4" />
              Cook Again
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
