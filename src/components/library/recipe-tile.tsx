import { cn } from "@/lib/utils";
import { RecipePhoto } from "./recipe-photo";

export function recipeTileClassName(selected?: boolean) {
  return cn(
    "group w-full cursor-pointer overflow-hidden rounded-xl p-2 text-left transition-colors hover:bg-accent/60 sm:w-56 sm:shrink-0",
    // Entrance animation, staggered per-tile via an inline animation-delay
    // at the call site — plays once on mount, not on every re-render, since
    // CSS animations don't replay for a DOM node React reuses across a
    // stable `key`.
    "animate-in fade-in-0 slide-in-from-bottom-1 fill-mode-both duration-300",
    selected && "bg-accent"
  );
}

interface RecipeTileProps {
  title: string;
  subtitle?: string;
  coverUrl?: string | null;
  /** Overlaid on the photo, e.g. a "cooked" checkmark badge. */
  badge?: React.ReactNode;
}

/** Photo + title/subtitle block shared by every grid that displays recipes (library, favorites, collections). */
export function RecipeTile({ title, subtitle, coverUrl, badge }: RecipeTileProps) {
  return (
    <>
      <div className="relative">
        <RecipePhoto title={title} coverUrl={coverUrl} />
        {badge}
      </div>
      <p className="mt-3 line-clamp-1 text-sm font-semibold">{title}</p>
      {subtitle && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{subtitle}</p>}
    </>
  );
}
