import Image from "next/image";
import { ChefHat } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecipePhotoProps {
  title: string;
  coverUrl?: string | null;
  className?: string;
}

export function RecipePhoto({ title, coverUrl, className }: RecipePhotoProps) {
  if (coverUrl) {
    return (
      <div
        className={cn(
          "relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-lg border border-border bg-muted",
          className
        )}
      >
        <Image
          src={coverUrl}
          alt={title}
          fill
          sizes="240px"
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={title}
      className={cn(
        "flex aspect-[4/3] w-full shrink-0 items-center justify-center rounded-lg border border-border bg-muted",
        className
      )}
    >
      <ChefHat className="size-8 text-foreground/15" strokeWidth={1.5} />
    </div>
  );
}
