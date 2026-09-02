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
import { cn } from "@/lib/utils";
import { COLLECTION_COLORS, nextCollectionColor, type Collection } from "@/lib/collections";

interface CollectionFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingCount: number;
  /** present -> edit this collection; absent -> create a new one */
  editingCollection?: Collection | null;
  onCreate: (name: string, color: string) => void;
  onEdit?: (id: string, name: string, color: string) => void;
}

export function CollectionFormDrawer({
  open,
  onOpenChange,
  existingCount,
  editingCollection,
  onCreate,
  onEdit,
}: CollectionFormDrawerProps) {
  const [name, setName] = React.useState("");
  const [color, setColor] = React.useState(COLLECTION_COLORS[0]);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const isEditing = !!editingCollection;

  React.useEffect(() => {
    if (!open) return;
    setName(editingCollection?.name ?? "");
    setColor(editingCollection?.color ?? nextCollectionColor(existingCount));
    requestAnimationFrame(() => inputRef.current?.focus());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingCollection?.id, existingCount]);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (isEditing && editingCollection) {
      onEdit?.(editingCollection.id, trimmed, color);
    } else {
      onCreate(trimmed, color);
    }
    onOpenChange(false);
  };

  return (
    <SideDrawer
      open={open}
      onOpenChange={onOpenChange}
      modal={false}
      disablePointerDismissal
    >
      <DrawerHeader>
        <DrawerTitle>{isEditing ? "Edit Collection" : "New Collection"}</DrawerTitle>
        <DrawerDescription>Give it a name and a color to spot it by.</DrawerDescription>
      </DrawerHeader>

      <div className="flex flex-col gap-5 px-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="collection-name" className="text-sm font-medium">
            Name
          </label>
          <Input
            id="collection-name"
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            placeholder="e.g. Weeknight Dinners"
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Color</p>
          <div className="flex flex-wrap gap-2">
            {COLLECTION_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                onClick={() => setColor(c)}
                className={cn(
                  "flex size-8 items-center justify-center rounded-full transition-transform hover:scale-110",
                  c,
                  color === c && "ring-2 ring-foreground ring-offset-2 ring-offset-popover"
                )}
              />
            ))}
          </div>
        </div>
      </div>

      <DrawerFooter className="sm:flex-row sm:justify-end">
        <DrawerClose render={<Button variant="outline">Cancel</Button>} />
        <Button onClick={handleSubmit} disabled={!name.trim()}>
          {isEditing ? "Save changes" : "Create collection"}
        </Button>
      </DrawerFooter>
    </SideDrawer>
  );
}
