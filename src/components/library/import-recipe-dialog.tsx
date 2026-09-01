"use client";

import * as React from "react";
import { Link2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLibraryShell } from "./library-shell-context";

interface ImportRecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportRecipeDialog({ open, onOpenChange }: ImportRecipeDialogProps) {
  const { importing, importFromUrl } = useLibraryShell();
  const [url, setUrl] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setUrl("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const handleSubmit = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    await importFromUrl(trimmed);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import a recipe</DialogTitle>
          <DialogDescription>
            Paste a link to a recipe page — Recipery reads the ingredients, steps, and photo most
            sites already publish for search engines. Paste a YouTube link to pull in the title
            and thumbnail with the video attached — add ingredients and steps yourself after.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Link2 className="size-4 shrink-0 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            placeholder="https://example.com/some-recipe"
            disabled={importing}
          />
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline">Cancel</Button>} />
          <Button onClick={handleSubmit} disabled={!url.trim() || importing} className="gap-2">
            {importing && <Loader2 className="size-4 animate-spin" />}
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
