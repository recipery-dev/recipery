"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Minus, Plus, X } from "lucide-react";
import { IngredientChecklist } from "./ingredient-checklist";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useLibraryShell } from "./library-shell-context";
import { recipeStepImageUrl, type Recipe } from "@/lib/recipes/types";

interface CookModeProps {
  recipe: Recipe | null;
  open: boolean;
  onClose: () => void;
}

/**
 * Full-screen, one-step-at-a-time cooking view. A fixed CSS overlay rather
 * than the real Fullscreen API — requestFullscreen needs a user gesture and
 * is unreliable on iPhone Safari, which most home cooks at the stove use.
 */
export function CookMode({ recipe, open, onClose }: CookModeProps) {
  const { settings, servings, setServings } = useLibraryShell();
  const [stepIndex, setStepIndex] = React.useState(0);
  const [checked, setChecked] = React.useState<Set<string>>(new Set());
  const [showIngredients, setShowIngredients] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const stepCount = recipe?.steps.length ?? 0;

  // A different recipe opened, or Cook Mode reopened — start from step one
  // with a fresh checklist rather than carrying over the previous session.
  React.useEffect(() => {
    if (!open) return;
    setStepIndex(0);
    setChecked(new Set());
    setShowIngredients(false);
  }, [recipe?.id, open]);

  // Cook Mode is rendered as a sibling of the (still-open, non-modal)
  // recipe drawer, so focus can be left sitting on the drawer's own DOM
  // underneath (e.g. its popup container reclaims focus on open). Move
  // focus in for a11y, but don't rely on it for the shortcuts below.
  React.useEffect(() => {
    if (!open) return;
    containerRef.current?.focus();
  }, [open]);

  const goPrev = React.useCallback(
    () => setStepIndex((i) => Math.max(0, i - 1)),
    [],
  );
  const goNext = React.useCallback(
    () => setStepIndex((i) => Math.min(stepCount - 1, i + 1)),
    [stepCount],
  );

  // Capture phase, on document, so this fires regardless of which element
  // in the underlying drawer currently has focus — the drawer has no
  // capture-phase handler of its own to race against this way.
  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [open, goPrev, goNext, onClose]);

  // Keep the screen awake while cooking. Feature-detected — Cook Mode works
  // fully without it on unsupported browsers, just without the keep-awake
  // guarantee. The lock is released automatically when the tab backgrounds,
  // so it's re-acquired on visibilitychange.
  React.useEffect(() => {
    if (!open) return;
    if (!("wakeLock" in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          void lock.release();
          return;
        }
        sentinel = lock;
      } catch {
        // e.g. blocked by battery saver — cook mode still works fine
      }
    };
    void acquire();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !sentinel) void acquire();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void sentinel?.release();
    };
  }, [open]);

  const touchStartX = React.useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx =
      (e.changedTouches[0]?.clientX ?? touchStartX.current) -
      touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 50) return;
    if (dx > 0) goPrev();
    else goNext();
  };

  const toggleChecked = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!open || !recipe) return null;

  const step = recipe.steps[stepIndex];
  const imageUrl = step ? recipeStepImageUrl(recipe.id, step) : null;
  const factor = recipe.servings && servings ? servings / recipe.servings : 1;

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Cook mode: ${recipe.title}`}
      tabIndex={-1}
      className="fixed inset-0 z-[60] flex flex-col bg-background outline-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border p-4">
        <h2 className="min-w-0 truncate font-heading text-base font-bold">
          {recipe.title}
        </h2>
        <div className="flex shrink-0 items-center gap-2">
          {recipe.servings !== undefined && (
            <div className="flex items-center gap-0.5 rounded-full bg-secondary px-1 py-1">
              <button
                type="button"
                aria-label="Fewer servings"
                onClick={() => setServings(Math.max(1, servings - 1))}
                className="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
              >
                <Minus className="size-3" />
              </button>
              <span className="px-1 text-center text-sm font-medium whitespace-nowrap tabular-nums">
                {servings}
              </span>
              <button
                type="button"
                aria-label="More servings"
                onClick={() => setServings(servings + 1)}
                className="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
              >
                <Plus className="size-3" />
              </button>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Exit cook mode"
            onClick={onClose}
          >
            <X className="size-5" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-6 py-8">
        {step ? (
          <>
            <span className="flex shrink-0 items-center justify-center rounded-full bg-muted px-3 py-1 text-sm font-semibold tabular-nums">
              Step {stepIndex + 1} / {stepCount}
            </span>
            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={`Step ${stepIndex + 1}`}
                className="max-h-64 w-full max-w-xl rounded-xl border border-border object-cover"
              />
            )}
            <p className="max-w-xl text-center text-xl leading-relaxed font-medium text-balance">
              {step.text}
            </p>
          </>
        ) : (
          <p className="text-center text-muted-foreground">
            This recipe has no steps.
          </p>
        )}
      </div>

      <div className="shrink-0 border-t border-border">
        {showIngredients && (
          <div className="max-h-64 overflow-y-auto border-b border-border p-4">
            <IngredientChecklist
              ingredients={recipe.ingredients}
              factor={factor}
              checked={checked}
              onToggle={toggleChecked}
              showGramHints={settings.showIngredientGramHints}
            />
          </div>
        )}
        <div className="flex items-center justify-between gap-3 p-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowIngredients((v) => !v)}
          >
            {showIngredients ? "Hide" : "Show"} ingredients
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous step"
              disabled={stepIndex === 0}
              onClick={goPrev}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next step"
              disabled={stepIndex >= stepCount - 1}
              onClick={goNext}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <Progress
        value={stepCount > 0 ? ((stepIndex + 1) / stepCount) * 100 : 0}
        aria-label="Step progress"
        className="w-full shrink-0"
      />
    </div>
  );
}
