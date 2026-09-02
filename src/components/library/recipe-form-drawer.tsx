"use client";

import * as React from "react";
import {
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { SideDrawer } from "@/components/side-drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ClipboardPaste, ImageUp, Loader2, Plus, Trash2, ChevronDown, X } from "lucide-react";
import { recipeCoverUrl, recipeStepImageUrl, type RecipeDifficulty, type RecipeRecord } from "@/lib/recipes/types";
import { parseIngredientListText } from "@/lib/recipes/ingredient-text";

// Common cooking units for the dropdown — anything else falls back to a free-text "Custom…" field.
const UNIT_OPTIONS = [
  // Metric first.
  "g",
  "kg",
  "ml",
  "l",
  // Imperial volume.
  "tsp",
  "tbsp",
  "cup",
  "fl oz",
  "pt",
  "qt",
  "gal",
  // Imperial weight.
  "oz",
  "lb",
  // Everything else.
  "pinch",
  "dash",
  "clove",
  "slice",
  "can",
  "package",
  "stick",
  "piece",
];
const CUSTOM_UNIT = "__custom__";

interface IngredientRow {
  id: string;
  quantity: string;
  unit: string;
  /** true once the unit doesn't match the dropdown list, so we show a text field instead */
  customUnit: boolean;
  name: string;
  note: string;
}

interface StepRow {
  id: string;
  text: string;
  hasImage: boolean;
  imageExt?: string;
  imageUpdatedAt?: string;
  newFile: File | null;
  newPreviewUrl: string | null;
}

function newIngredientRow(): IngredientRow {
  return { id: crypto.randomUUID(), quantity: "", unit: "", customUnit: false, name: "", note: "" };
}

function newStepRow(): StepRow {
  return { id: crypto.randomUUID(), text: "", hasImage: false, newFile: null, newPreviewUrl: null };
}

function fromRecord(record?: RecipeRecord) {
  const ingredients: IngredientRow[] = record?.ingredients.length
    ? record.ingredients.map((i) => ({
        id: i.id,
        quantity: i.quantity ?? "",
        unit: i.unit ?? "",
        customUnit: !!i.unit && !UNIT_OPTIONS.includes(i.unit),
        name: i.name,
        note: i.note ?? "",
      }))
    : [newIngredientRow()];

  const steps: StepRow[] = record?.steps.length
    ? record.steps.map((s) => ({
        id: s.id,
        text: s.text,
        hasImage: s.hasImage,
        imageExt: s.imageExt,
        imageUpdatedAt: s.imageUpdatedAt,
        newFile: null,
        newPreviewUrl: null,
      }))
    : [newStepRow()];

  return { ingredients, steps };
}

interface RecipeFormDrawerProps {
  mode: "create" | "edit";
  recipe?: RecipeRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (record: RecipeRecord) => void;
}

export function RecipeFormDrawer({ mode, recipe, open, onOpenChange, onSaved }: RecipeFormDrawerProps) {
  const initial = fromRecord(recipe);

  const [title, setTitle] = React.useState(recipe?.title ?? "");
  const [source, setSource] = React.useState(recipe?.source ?? "");
  const [videoUrl, setVideoUrl] = React.useState(recipe?.videoUrl ?? "");
  const [description, setDescription] = React.useState(recipe?.description ?? "");
  const [servings, setServings] = React.useState(recipe?.servings ? String(recipe.servings) : "");
  const [prepMinutes, setPrepMinutes] = React.useState(recipe?.prepMinutes ? String(recipe.prepMinutes) : "");
  const [cookMinutes, setCookMinutes] = React.useState(recipe?.cookMinutes ? String(recipe.cookMinutes) : "");
  const [difficulty, setDifficulty] = React.useState<RecipeDifficulty | "">(recipe?.difficulty ?? "");
  const [cuisine, setCuisine] = React.useState(recipe?.cuisine ?? "");
  const [tags, setTags] = React.useState(recipe?.tags.join(", ") ?? "");
  const [ingredients, setIngredients] = React.useState<IngredientRow[]>(initial.ingredients);
  const [steps, setSteps] = React.useState<StepRow[]>(initial.steps);
  const [detailsOpen, setDetailsOpen] = React.useState(false);

  const [coverFile, setCoverFile] = React.useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = React.useState<string | null>(null);
  const [coverRemoved, setCoverRemoved] = React.useState(false);
  const existingCoverUrl = recipe ? recipeCoverUrl(recipe) : null;
  const displayedCoverUrl = coverPreviewUrl ?? (coverRemoved ? null : existingCoverUrl);
  const titleInputRef = React.useRef<HTMLInputElement>(null);

  const [saving, setSaving] = React.useState(false);

  // Resets to the target recipe's fields (or blank, for create) each time the
  // drawer opens — editing a second recipe right after the first shouldn't
  // show stale data from the previous one.
  React.useEffect(() => {
    if (!open) return;
    const fresh = fromRecord(recipe);
    setTitle(recipe?.title ?? "");
    setSource(recipe?.source ?? "");
    setVideoUrl(recipe?.videoUrl ?? "");
    setDescription(recipe?.description ?? "");
    setServings(recipe?.servings ? String(recipe.servings) : "");
    setPrepMinutes(recipe?.prepMinutes ? String(recipe.prepMinutes) : "");
    setCookMinutes(recipe?.cookMinutes ? String(recipe.cookMinutes) : "");
    setDifficulty(recipe?.difficulty ?? "");
    setCuisine(recipe?.cuisine ?? "");
    setTags(recipe?.tags.join(", ") ?? "");
    setIngredients(fresh.ingredients);
    setSteps(fresh.steps);
    setDetailsOpen(false);
    setCoverFile(null);
    setCoverRemoved(false);
    requestAnimationFrame(() => titleInputRef.current?.focus());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, recipe?.id]);

  React.useEffect(() => {
    if (!coverFile) {
      setCoverPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(coverFile);
    setCoverPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.add({ title: "Photo must be an image file", type: "error" });
      return;
    }
    setCoverFile(file);
    setCoverRemoved(false);
  };

  const handleRemoveCover = () => {
    setCoverFile(null);
    setCoverRemoved(true);
  };

  const updateIngredient = (id: string, patch: Partial<IngredientRow>) => {
    setIngredients((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };
  const addIngredient = () => setIngredients((prev) => [...prev, newIngredientRow()]);
  const removeIngredient = (id: string) =>
    setIngredients((prev) => (prev.length > 1 ? prev.filter((i) => i.id !== id) : prev));

  const [bulkOpen, setBulkOpen] = React.useState(false);
  const [bulkText, setBulkText] = React.useState("");
  const addBulkIngredients = () => {
    const parsed = parseIngredientListText(bulkText);
    if (parsed.length === 0) return;
    const rows: IngredientRow[] = parsed.map((p) => ({
      id: crypto.randomUUID(),
      quantity: p.quantity ?? "",
      unit: p.unit ?? "",
      customUnit: !!p.unit && !UNIT_OPTIONS.includes(p.unit),
      name: p.name,
      note: "",
    }));
    // Drop the empty placeholder row(s) rather than leaving a blank row
    // mixed in with the newly pasted ones.
    setIngredients((prev) => [...prev.filter((i) => i.name.trim()), ...rows]);
    setBulkText("");
    setBulkOpen(false);
  };

  const updateStep = (id: string, patch: Partial<StepRow>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };
  const addStep = () => setSteps((prev) => [...prev, newStepRow()]);
  const removeStep = (id: string) =>
    setSteps((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== id) : prev));
  const removeStepImage = (id: string) =>
    updateStep(id, {
      newFile: null,
      newPreviewUrl: null,
      hasImage: false,
      imageExt: undefined,
      imageUpdatedAt: undefined,
    });

  const [draggedStepId, setDraggedStepId] = React.useState<string | null>(null);
  const [dragOverStepId, setDragOverStepId] = React.useState<string | null>(null);
  const reorderSteps = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    setSteps((prev) => {
      const from = prev.findIndex((s) => s.id === draggedId);
      const to = prev.findIndex((s) => s.id === targetId);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const handleStepImageChange = (id: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.add({ title: "Photo must be an image file", type: "error" });
      return;
    }
    const url = URL.createObjectURL(file);
    updateStep(id, { newFile: file, newPreviewUrl: url });
  };

  const videoUrlValid = React.useMemo(() => {
    const trimmed = videoUrl.trim();
    if (!trimmed) return true;
    try {
      const parsed = new URL(trimmed);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }, [videoUrl]);

  const isValid = title.trim().length > 0 && videoUrlValid;

  const handleSubmit = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      const form = new FormData();
      form.set("title", title.trim());
      if (source.trim()) form.set("source", source.trim());
      if (recipe?.sourceUrl) form.set("sourceUrl", recipe.sourceUrl);
      if (videoUrl.trim()) form.set("videoUrl", videoUrl.trim());
      if (description.trim()) form.set("description", description.trim());
      if (servings.trim()) form.set("servings", servings.trim());
      if (prepMinutes.trim()) form.set("prepMinutes", prepMinutes.trim());
      if (cookMinutes.trim()) form.set("cookMinutes", cookMinutes.trim());
      if (difficulty) form.set("difficulty", difficulty);
      if (cuisine.trim()) form.set("cuisine", cuisine.trim());
      form.set(
        "tags",
        JSON.stringify(
          tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        )
      );
      form.set(
        "ingredients",
        JSON.stringify(
          ingredients
            .filter((i) => i.name.trim())
            .map((i) => ({ id: i.id, quantity: i.quantity.trim(), unit: i.unit.trim(), name: i.name.trim(), note: i.note.trim() }))
        )
      );
      form.set(
        "steps",
        JSON.stringify(
          steps
            .filter((s) => s.text.trim())
            .map((s) => ({
              id: s.id,
              text: s.text.trim(),
              hasImage: s.hasImage,
              imageExt: s.imageExt,
              imageUpdatedAt: s.imageUpdatedAt,
            }))
        )
      );
      if (coverFile) form.set("image", coverFile);
      else if (coverRemoved) form.set("removeImage", "1");
      for (const step of steps) {
        if (step.newFile) form.set(`step-image-${step.id}`, step.newFile);
      }

      const url = mode === "create" ? "/api/recipes" : `/api/recipes/${recipe!.id}/edit`;
      const res = await fetch(url, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save recipe");
      onSaved(data.recipe as RecipeRecord);
      onOpenChange(false);
    } catch (e) {
      toast.add({ title: "Couldn't save recipe", description: (e as Error).message, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SideDrawer
      open={open}
      onOpenChange={onOpenChange}
      modal={false}
    >
      <DrawerHeader>
        <DrawerTitle>{mode === "create" ? "New Recipe" : "Edit Recipe"}</DrawerTitle>
        <DrawerDescription className="pb-4">
          {mode === "create"
            ? "Enter a title, ingredients, and steps — add photos as you go."
            : "Update this recipe's details, ingredients, steps, and photos."}
        </DrawerDescription>
      </DrawerHeader>

      <div className="flex-1 overflow-x-hidden overflow-y-auto px-4 pt-4">
        <div className="flex flex-col gap-6 pb-4">
          <div className="flex flex-col gap-2">
            <div className="group relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-border bg-muted">
              <label
                aria-label={displayedCoverUrl ? "Replace cover photo" : "Add a cover photo"}
                className="absolute inset-0 cursor-pointer"
              >
                {displayedCoverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={displayedCoverUrl} alt="Recipe cover" className="size-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
                    Add a cover photo
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                  <ImageUp className="size-6 text-white" strokeWidth={1.75} />
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
              </label>
              {displayedCoverUrl && (
                <button
                  type="button"
                  onClick={handleRemoveCover}
                  aria-label="Remove cover photo"
                  className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-destructive group-hover:opacity-100"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="recipe-title" className="text-sm font-medium">
              Title
            </label>
            <Input
              id="recipe-title"
              ref={titleInputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Grandma's Lasagna"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="recipe-servings" className="text-sm font-medium">
                Servings
              </label>
              <Input
                id="recipe-servings"
                type="number"
                min={1}
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                placeholder="4"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="recipe-prep" className="text-sm font-medium">
                Prep (min)
              </label>
              <Input
                id="recipe-prep"
                type="number"
                min={1}
                value={prepMinutes}
                onChange={(e) => setPrepMinutes(e.target.value)}
                placeholder="15"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="recipe-cook" className="text-sm font-medium">
                Cook (min)
              </label>
              <Input
                id="recipe-cook"
                type="number"
                min={1}
                value={cookMinutes}
                onChange={(e) => setCookMinutes(e.target.value)}
                placeholder="30"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="recipe-difficulty" className="text-sm font-medium">
                Difficulty
              </label>
              <select
                id="recipe-difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as RecipeDifficulty | "")}
                className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">—</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="recipe-description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="recipe-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short note about this recipe"
              rows={3}
            />
          </div>

          <Collapsible open={detailsOpen || !videoUrlValid} onOpenChange={setDetailsOpen}>
            <CollapsibleTrigger>Additional details</CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mx-1 flex flex-col gap-6 px-1 pt-4 pb-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="recipe-source" className="text-sm font-medium">
                      Source
                    </label>
                    <Input
                      id="recipe-source"
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      placeholder="e.g. Grandma, or a site name"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="recipe-cuisine" className="text-sm font-medium">
                      Cuisine
                    </label>
                    <Input
                      id="recipe-cuisine"
                      value={cuisine}
                      onChange={(e) => setCuisine(e.target.value)}
                      placeholder="e.g. Italian"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="recipe-video" className="text-sm font-medium">
                    Video URL
                  </label>
                  <Input
                    id="recipe-video"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="e.g. a YouTube link"
                    aria-invalid={!videoUrlValid}
                    className={cn(videoUrlValid || "border-destructive focus-visible:ring-destructive/50")}
                  />
                  {!videoUrlValid && (
                    <p className="text-xs text-destructive">That doesn&rsquo;t look like a valid URL</p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="recipe-tags" className="text-sm font-medium">
                    Tags
                  </label>
                  <Input
                    id="recipe-tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="Comma-separated, e.g. weeknight, vegetarian"
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-sm font-bold">Ingredients</h3>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setBulkOpen((v) => !v)}
                >
                  <ClipboardPaste className="size-3.5" />
                  Paste list
                </Button>
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addIngredient}>
                  <Plus className="size-3.5" />
                  Add
                </Button>
              </div>
            </div>
            {bulkOpen && (
              <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3">
                <Textarea
                  autoFocus
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={"One ingredient per line, e.g.\n200g milk\n70g water\n1 egg"}
                  rows={5}
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setBulkOpen(false);
                      setBulkText("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="button" size="sm" disabled={!bulkText.trim()} onClick={addBulkIngredients}>
                    Add ingredients
                  </Button>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-2">
              {ingredients.map((row) => (
                <div key={row.id} className="flex items-center gap-2">
                  <Input
                    value={row.quantity}
                    onChange={(e) => updateIngredient(row.id, { quantity: e.target.value })}
                    placeholder="2"
                    className="w-16 shrink-0"
                  />
                  {row.customUnit ? (
                    <div className="relative w-24 shrink-0">
                      <Input
                        autoFocus
                        value={row.unit}
                        onChange={(e) => updateIngredient(row.id, { unit: e.target.value })}
                        placeholder="unit"
                        className="pr-7"
                      />
                      <button
                        type="button"
                        onClick={() => updateIngredient(row.id, { customUnit: false, unit: "" })}
                        aria-label="Choose from unit list"
                        className="absolute inset-y-0 right-1.5 flex items-center text-muted-foreground hover:text-foreground"
                      >
                        <ChevronDown className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    <select
                      value={row.unit}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === CUSTOM_UNIT) updateIngredient(row.id, { customUnit: true, unit: "" });
                        else updateIngredient(row.id, { unit: value });
                      }}
                      className="h-9 w-24 shrink-0 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <option value="">unit</option>
                      {UNIT_OPTIONS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                      <option value={CUSTOM_UNIT}>Custom…</option>
                    </select>
                  )}
                  <Input
                    value={row.name}
                    onChange={(e) => updateIngredient(row.id, { name: e.target.value })}
                    placeholder="flour"
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => removeIngredient(row.id)}
                    aria-label="Remove ingredient"
                    disabled={ingredients.length <= 1}
                    className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-sm font-bold">Steps</h3>
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addStep}>
                <Plus className="size-3.5" />
                Add
              </Button>
            </div>
            <div className="flex flex-col">
              {steps.map((step, index) => {
                const existingUrl =
                  step.hasImage && step.imageExt && recipe
                    ? recipeStepImageUrl(recipe.id, {
                        id: step.id,
                        text: step.text,
                        hasImage: step.hasImage,
                        imageExt: step.imageExt,
                        imageUpdatedAt: step.imageUpdatedAt,
                      })
                    : null;
                const previewUrl = step.newPreviewUrl ?? existingUrl;

                const isDropTarget =
                  dragOverStepId === step.id && !!draggedStepId && draggedStepId !== step.id;

                return (
                  <div
                    key={step.id}
                    onDragOver={(e) => {
                      if (draggedStepId) e.preventDefault();
                    }}
                    onDragEnter={() => {
                      if (draggedStepId && draggedStepId !== step.id) setDragOverStepId(step.id);
                    }}
                    onDragLeave={(e) => {
                      // dragenter/dragleave fire when moving onto a child too —
                      // only clear once the pointer actually left the row.
                      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                      setDragOverStepId((prev) => (prev === step.id ? null : prev));
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedStepId) reorderSteps(draggedStepId, step.id);
                      setDraggedStepId(null);
                      setDragOverStepId(null);
                    }}
                    className={cn(
                      "flex gap-3 py-3 first:pt-0 last:pb-0",
                      index > 0 && "border-t transition-colors duration-150",
                      index > 0 && (isDropTarget ? "border-t-2 border-ring" : "border-border/60"),
                      draggedStepId === step.id && "opacity-40"
                    )}
                  >
                    <div
                      draggable
                      onDragStart={() => setDraggedStepId(step.id)}
                      onDragEnd={() => {
                        setDraggedStepId(null);
                        setDragOverStepId(null);
                      }}
                      title="Drag to reorder"
                      className="mt-1 flex size-6 shrink-0 cursor-grab items-center justify-center rounded-full bg-muted text-xs font-semibold select-none active:cursor-grabbing"
                    >
                      {index + 1}
                    </div>
                    <div className="group/step relative flex-1">
                      <Textarea
                        value={step.text}
                        onChange={(e) => updateStep(step.id, { text: e.target.value })}
                        placeholder={`Step ${index + 1}`}
                        rows={2}
                        className="resize-none pr-16"
                      />
                      <div className="absolute right-1.5 bottom-1.5 flex items-center gap-0.5">
                        <div
                          className={cn(
                            "group/photo relative shrink-0 transition-opacity",
                            !previewUrl &&
                              "opacity-0 group-hover/step:opacity-100 group-focus-within/step:opacity-100"
                          )}
                        >
                          <label
                            className="flex size-7 cursor-pointer items-center justify-center overflow-hidden rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            aria-label={previewUrl ? "Replace step photo" : "Add step photo"}
                          >
                            {previewUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={previewUrl} alt="" className="size-full object-cover" />
                            ) : (
                              <ImageUp className="size-4" strokeWidth={1.75} />
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleStepImageChange(step.id)}
                            />
                          </label>
                          {previewUrl && (
                            <button
                              type="button"
                              onClick={() => removeStepImage(step.id)}
                              aria-label="Remove step photo"
                              className="absolute -top-1.5 -right-1.5 hidden size-4 items-center justify-center rounded-full bg-destructive text-white group-hover/photo:flex"
                            >
                              <X className="size-2.5" />
                            </button>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeStep(step.id)}
                          aria-label="Remove step"
                          disabled={steps.length <= 1}
                          className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity group-hover/step:opacity-100 group-focus-within/step:opacity-100 hover:bg-accent hover:text-destructive disabled:pointer-events-none disabled:opacity-30"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <DrawerFooter className="sm:flex-row sm:justify-end pt-4">
        <DrawerClose render={<Button variant="outline">Cancel</Button>} />
        <Button onClick={handleSubmit} disabled={!isValid || saving} className="gap-2">
          {saving && <Loader2 className="size-4 animate-spin" />}
          {mode === "create" ? "Create recipe" : "Save changes"}
        </Button>
      </DrawerFooter>
    </SideDrawer>
  );
}
