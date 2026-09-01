"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LibraryBig,
  Compass,
  Plus,
  MoreVertical,
  Pencil,
  ShoppingCart,
  Trash2,
  Settings,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RECIPE_DRAG_MIME } from "@/lib/dnd";
import { toast } from "@/components/ui/toast";
import { CollectionFormDrawer } from "./collection-form-drawer";
import { ProfileSwitcher } from "./profile-switcher";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { type Collection } from "@/lib/collections";
import { useLibraryShell } from "./library-shell-context";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const LIBRARY_ITEM: NavItem = { href: "/", label: "Library", icon: LibraryBig };
const NAV_ITEMS: NavItem[] = [{ href: "/shopping-list", label: "Shopping List", icon: ShoppingCart }];

const FOOTER_ITEMS = [
  { href: "/settings", label: "Settings", icon: Settings, external: false },
  {
    href: "https://docs.recipery.dev",
    label: "Help",
    icon: HelpCircle,
    external: true,
  },
] as const;

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  const {
    recipes,
    collections,
    smartCollections,
    createCollection,
    renameCollection,
    recolorCollection,
    deleteCollection,
    addRecipeToCollection,
    setDiscoverOpen,
  } = useLibraryShell();

  const [confirmDelete, setConfirmDelete] = React.useState<Collection | null>(
    null,
  );
  const [collectionDrawerOpen, setCollectionDrawerOpen] = React.useState(false);
  const [editingCollection, setEditingCollection] =
    React.useState<Collection | null>(null);
  const [dragOverCollectionId, setDragOverCollectionId] = React.useState<
    string | null
  >(null);

  // Navigating to a new page (e.g. tapping a nav item or collection in the
  // mobile sheet) should collapse the sidebar instead of leaving it open
  // over the new page.
  React.useEffect(() => {
    setOpenMobile(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleCollectionDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes(RECIPE_DRAG_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleCollectionDrop =
    (collection: Collection) => (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes(RECIPE_DRAG_MIME)) return;
      e.preventDefault();
      setDragOverCollectionId(null);
      const recipeId = e.dataTransfer.getData(RECIPE_DRAG_MIME);
      if (!recipeId) return;
      const recipe = recipes.find((r) => r.id === recipeId);
      if (collection.recipeIds.includes(recipeId)) {
        toast.add({
          title: "Already in collection",
          description: recipe
            ? `"${recipe.title}" is already in ${collection.name}`
            : undefined,
          type: "info",
        });
        return;
      }
      addRecipeToCollection(collection.id, recipeId);
      toast.add({
        title: "Added to collection",
        description: recipe
          ? `"${recipe.title}" was added to ${collection.name}`
          : undefined,
        type: "success",
      });
    };

  const startCreate = () => {
    setEditingCollection(null);
    setCollectionDrawerOpen(true);
  };

  const startEdit = (collection: Collection) => {
    setEditingCollection(collection);
    setCollectionDrawerOpen(true);
  };

  const handleCollectionEdited = (id: string, name: string, color: string) => {
    renameCollection(id, name);
    recolorCollection(id, color);
  };

  const handleDeleteCollection = (id: string) => {
    deleteCollection(id);
    if (pathname === `/collection/${id}`) router.push("/");
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader>
        <ProfileSwitcher />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu className="gap-1">
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname === LIBRARY_ITEM.href}
                tooltip={LIBRARY_ITEM.label}
                render={<Link href={LIBRARY_ITEM.href} />}
              >
                <LIBRARY_ITEM.icon />
                <span>{LIBRARY_ITEM.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Discover" onClick={() => setDiscoverOpen(true)}>
                <Compass />
                <span>Discover</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {NAV_ITEMS.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  isActive={pathname === item.href}
                  tooltip={item.label}
                  render={<Link href={item.href} />}
                >
                  <item.icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="uppercase tracking-wider">
            Smart Collections
          </SidebarGroupLabel>
          <SidebarMenu className="gap-1">
            {smartCollections.map((collection) => (
              <SidebarMenuItem key={collection.id}>
                <SidebarMenuButton
                  isActive={pathname === `/collection/${collection.id}`}
                  tooltip={collection.name}
                  render={<Link href={`/collection/${collection.id}`} />}
                >
                  <collection.icon />
                  <span>{collection.name}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="uppercase tracking-wider">
            Collections
          </SidebarGroupLabel>
          <SidebarGroupAction
            onClick={startCreate}
            title="New collection"
            aria-label="New collection"
          >
            <Plus />
          </SidebarGroupAction>
          <SidebarMenu className="gap-1">
            {collections.map((collection) => {
              const active = pathname === `/collection/${collection.id}`;
              const letter =
                collection.name.trim().charAt(0).toUpperCase() || "?";

              return (
                <SidebarMenuItem
                  key={collection.id}
                  onDragOver={handleCollectionDragOver}
                  onDragEnter={(e) => {
                    if (!e.dataTransfer.types.includes(RECIPE_DRAG_MIME))
                      return;
                    setDragOverCollectionId(collection.id);
                  }}
                  onDragLeave={(e) => {
                    // dragleave fires when moving onto a child too — only
                    // clear the highlight once the pointer actually left
                    // the row, or it flickers.
                    if (!e.dataTransfer.types.includes(RECIPE_DRAG_MIME))
                      return;
                    if (e.currentTarget.contains(e.relatedTarget as Node))
                      return;
                    setDragOverCollectionId((prev) =>
                      prev === collection.id ? null : prev,
                    );
                  }}
                  onDrop={handleCollectionDrop(collection)}
                >
                  <SidebarMenuButton
                    isActive={active}
                    tooltip={collection.name}
                    render={<Link href={`/collection/${collection.id}`} />}
                    className={cn(
                      dragOverCollectionId === collection.id &&
                        "bg-sidebar-accent text-sidebar-accent-foreground ring-2 ring-sidebar-ring",
                    )}
                  >
                    <Avatar className="size-5">
                      <AvatarFallback
                        className={cn(
                          collection.color,
                          "text-[10px] font-semibold text-white",
                        )}
                      >
                        {letter}
                      </AvatarFallback>
                    </Avatar>
                    <span>{collection.name}</span>
                  </SidebarMenuButton>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <SidebarMenuAction
                          showOnHover
                          aria-label={`${collection.name} options`}
                        />
                      }
                    >
                      <MoreVertical />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      side="right"
                      className="w-36"
                    >
                      <DropdownMenuItem onClick={() => startEdit(collection)}>
                        <Pencil className="size-3.5" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setConfirmDelete(collection)}
                      >
                        <Trash2 className="size-3.5" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              );
            })}

            {collections.length === 0 && (
              <SidebarMenuItem>
                <span className="block px-2 py-1.5 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                  No collections yet.
                </span>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu className="gap-1">
          {FOOTER_ITEMS.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                isActive={!item.external && pathname === item.href}
                tooltip={item.label}
                render={
                  item.external ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  ) : (
                    <Link href={item.href} />
                  )
                }
              >
                <item.icon />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(open) => {
          if (!open) setConfirmDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{confirmDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the collection. Recipes in it stay in your library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (confirmDelete) handleDeleteCollection(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CollectionFormDrawer
        open={collectionDrawerOpen}
        onOpenChange={setCollectionDrawerOpen}
        existingCount={collections.length}
        editingCollection={editingCollection}
        onCreate={createCollection}
        onEdit={handleCollectionEdited}
      />
    </Sidebar>
  );
}
