"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Search, Plus, Link2, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { SearchDialog } from "./search-dialog";
import { ImportRecipeDialog } from "./import-recipe-dialog";
import { useLibraryShell } from "./library-shell-context";
import { DEMO_MODE } from "@/lib/demo-mode";

export function AppHeader() {
  const { openCreateRecipe, discoverQuery, setDiscoverQuery, submitDiscoverQuery } = useLibraryShell();
  const isDiscover = usePathname() === "/discover";
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const discoverInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isDiscover) {
          discoverInputRef.current?.focus();
          discoverInputRef.current?.select();
        } else {
          setSearchOpen(true);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDiscover]);

  return (
    <header className="flex h-20 shrink-0 items-center gap-2 px-4 md:gap-4 md:px-8">
      <SidebarTrigger className="shrink-0 rounded-full md:hidden" />

      {isDiscover ? (
        <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-full border border-border bg-muted/40 px-4 py-2.5 md:max-w-sm">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={discoverInputRef}
            value={discoverQuery}
            onChange={(e) => setDiscoverQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitDiscoverQuery(discoverQuery);
            }}
            placeholder="Search recipe sites…"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden shrink-0 rounded border border-border bg-background px-1.5 py-0.5 font-sans text-[10px] font-medium sm:block">
            ⌘K
          </kbd>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-full border border-border bg-muted/40 px-4 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/70 md:max-w-sm"
        >
          <Search className="size-4 shrink-0" />
          <span className="flex-1 truncate">Search your recipes…</span>
          <kbd className="hidden shrink-0 rounded border border-border bg-background px-1.5 py-0.5 font-sans text-[10px] font-medium sm:block">
            ⌘K
          </kbd>
        </button>
      )}

      {!DEMO_MODE && (
        <div className="flex shrink-0 items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="icon" className="rounded-full" aria-label="Add recipe">
                  <Plus className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => setImportOpen(true)}>
                <Link2 className="size-3.5" />
                Import from URL
              </DropdownMenuItem>
              <DropdownMenuItem onClick={openCreateRecipe}>
                <NotebookPen className="size-3.5" />
                Enter manually
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <ImportRecipeDialog open={importOpen} onOpenChange={setImportOpen} />
    </header>
  );
}
