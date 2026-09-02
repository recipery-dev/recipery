"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import {
  User,
  Moon,
  Loader2,
  Users,
  LayoutGrid,
  BarChart3,
  Download,
  Compass,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useLibraryShell } from "@/components/library/library-shell-context";
import { DEMO_MODE } from "@/lib/demo-mode";
import { ManageProfilesPanel } from "./manage-profiles-panel";
import { StatsPanel } from "./stats-panel";
import { PROFILE_COLORS, type PublicProfile } from "@/lib/profiles/types";
import type { PublicAppSettings, RecipeDiscoverySource } from "@/lib/settings/types";

interface SettingsPanelProps {
  settings: PublicAppSettings;
  profile: PublicProfile;
}

type Category = "profile" | "stats" | "theme" | "profiles" | "library" | "discovery" | "backup";

const CATEGORIES: {
  id: Category;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "stats", label: "Stats", icon: BarChart3 },
  { id: "profiles", label: "Manage Profiles", icon: Users, adminOnly: true },
  { id: "theme", label: "Theme", icon: Moon },
  { id: "library", label: "Library", icon: LayoutGrid, adminOnly: true },
  { id: "discovery", label: "Recipe Discovery", icon: Compass, adminOnly: true },
  { id: "backup", label: "Backup", icon: Download, adminOnly: true },
];

function newDiscoverySource(): RecipeDiscoverySource {
  return { id: crypto.randomUUID(), name: "", searchUrlTemplate: "", browseUrl: "" };
}

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="sm:shrink-0">{children}</div>
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border p-5">
        <h2 className="font-heading text-base font-bold">{title}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="px-5">{children}</div>
      {footer && <div className="flex justify-end border-t border-border p-4">{footer}</div>}
    </div>
  );
}

export function SettingsPanel({ settings, profile }: SettingsPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, setTheme } = useTheme();
  const { profiles, activeProfileId } = useLibraryShell();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const isAdmin = profile.role === "admin";
  const visibleCategories = CATEGORIES.filter((c) => !c.adminOnly || isAdmin);
  const tabParam = searchParams.get("tab");
  const [categoryState, setCategory] = React.useState<Category>(
    () => CATEGORIES.find((c) => c.id === tabParam)?.id ?? "profile"
  );
  const category = visibleCategories.some((c) => c.id === categoryState)
    ? categoryState
    : "profile";

  React.useEffect(() => {
    const match = CATEGORIES.find((c) => c.id === tabParam)?.id;
    if (match) setCategory(match);
  }, [tabParam]);

  const selectCategory = (id: Category) => {
    setCategory(id);
    router.replace(`/settings?tab=${id}`, { scroll: false });
  };

  // Collapses a burst of autosaves (e.g. tabbing through several fields) into
  // a single "Saved" toast instead of one per field.
  const savedToastTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const notifySaved = () => {
    if (savedToastTimeout.current) clearTimeout(savedToastTimeout.current);
    savedToastTimeout.current = setTimeout(() => {
      toast.add({ title: "Saved", type: "success" });
    }, 600);
  };
  React.useEffect(() => {
    return () => {
      if (savedToastTimeout.current) clearTimeout(savedToastTimeout.current);
    };
  }, []);

  // profile fields
  const [name, setName] = React.useState(profile.name);
  const [color, setColor] = React.useState(profile.color);

  // profile password
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [savingPassword, setSavingPassword] = React.useState(false);
  const [removingPassword, setRemovingPassword] = React.useState(false);

  // library
  const [recipesPerPage, setRecipesPerPage] = React.useState(settings.recipesPerPage);
  const [searchResultLimit, setSearchResultLimit] = React.useState(settings.searchResultLimit);
  const [imageMaxSizeMb, setImageMaxSizeMb] = React.useState(settings.imageMaxSizeMb);
  const [showIngredientGramHints, setShowIngredientGramHints] = React.useState(
    settings.showIngredientGramHints
  );

  // recipe discovery
  const [discoverySources, setDiscoverySources] = React.useState<RecipeDiscoverySource[]>(
    settings.recipeDiscoverySources
  );
  const [savingDiscoverySources, setSavingDiscoverySources] = React.useState(false);
  const discoverySourcesDirty =
    JSON.stringify(discoverySources) !== JSON.stringify(settings.recipeDiscoverySources);
  const [draggedSourceId, setDraggedSourceId] = React.useState<string | null>(null);
  const [dragOverSourceId, setDragOverSourceId] = React.useState<string | null>(null);
  // Which sources have their (optional, rarely-needed) browse URL field
  // expanded — collapsed by default to keep each row to one line.
  const [expandedBrowseUrlIds, setExpandedBrowseUrlIds] = React.useState<Set<string>>(new Set());
  const reorderDiscoverySources = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    setDiscoverySources((prev) => {
      const from = prev.findIndex((s) => s.id === draggedId);
      const to = prev.findIndex((s) => s.id === targetId);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  React.useEffect(() => {
    setName(profile.name);
    setColor(profile.color);
  }, [profile]);

  const saveProfile = async (overrides?: Partial<{ name: string; color: string }>) => {
    const payload = {
      name: overrides?.name ?? name,
      color: overrides?.color ?? color,
    };
    try {
      const res = await fetch(`/api/profiles/${profile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      notifySaved();
      router.refresh();
    } catch {
      toast.add({ title: "Couldn't save profile", type: "error" });
    }
  };

  const savePassword = async () => {
    if (!newPassword || !confirmPassword) return;
    if (newPassword !== confirmPassword) {
      toast.add({ title: "Passwords don't match", type: "error" });
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch(`/api/profiles/${profile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: currentPassword || undefined,
          password: newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to update password");
      toast.add({ title: "Password updated", type: "success" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      router.refresh();
    } catch (e) {
      toast.add({ title: "Couldn't update password", description: (e as Error).message, type: "error" });
    } finally {
      setSavingPassword(false);
    }
  };

  const removePassword = async () => {
    setRemovingPassword(true);
    try {
      const res = await fetch(`/api/profiles/${profile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: currentPassword || undefined,
          removePassword: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to remove password");
      toast.add({ title: "Password removed", type: "success" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      router.refresh();
    } catch (e) {
      toast.add({ title: "Couldn't remove password", description: (e as Error).message, type: "error" });
    } finally {
      setRemovingPassword(false);
    }
  };

  const saveRecipesPerPage = async (value?: number) => {
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipesPerPage: value ?? recipesPerPage }),
      });
      if (!res.ok) throw new Error();
      notifySaved();
      router.refresh();
    } catch {
      toast.add({ title: "Couldn't save settings", type: "error" });
    }
  };

  const saveSearchResultLimit = async (value?: number) => {
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchResultLimit: value ?? searchResultLimit }),
      });
      if (!res.ok) throw new Error();
      notifySaved();
      router.refresh();
    } catch {
      toast.add({ title: "Couldn't save settings", type: "error" });
    }
  };

  const saveImageMaxSizeMb = async (value?: number) => {
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageMaxSizeMb: value ?? imageMaxSizeMb }),
      });
      if (!res.ok) throw new Error();
      notifySaved();
      router.refresh();
    } catch {
      toast.add({ title: "Couldn't save settings", type: "error" });
    }
  };

  const saveDiscoverySources = async () => {
    const cleaned = discoverySources
      .map((s) => ({
        id: s.id,
        name: s.name.trim(),
        searchUrlTemplate: s.searchUrlTemplate.trim(),
        browseUrl: s.browseUrl?.trim() || undefined,
      }))
      .filter((s) => s.name || s.searchUrlTemplate);

    for (const s of cleaned) {
      if (!s.name) {
        toast.add({ title: "Each source needs a name", type: "error" });
        return;
      }
      if (!s.searchUrlTemplate.includes("{query}")) {
        toast.add({
          title: `"${s.name}" needs a search URL with a "{query}" placeholder`,
          description: 'e.g. https://example.com/search?q={query}',
          type: "error",
        });
        return;
      }
      try {
        const parsed = new URL(s.searchUrlTemplate.replace("{query}", "x"));
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error();
      } catch {
        toast.add({ title: `"${s.name}" doesn't have a valid http(s) URL`, type: "error" });
        return;
      }
      if (s.browseUrl) {
        try {
          const parsed = new URL(s.browseUrl);
          if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error();
        } catch {
          toast.add({ title: `"${s.name}"'s browse URL isn't a valid http(s) URL`, type: "error" });
          return;
        }
      }
    }

    setSavingDiscoverySources(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeDiscoverySources: cleaned }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setDiscoverySources(cleaned);
      toast.add({ title: "Saved", type: "success" });
      router.refresh();
    } catch (e) {
      toast.add({ title: "Couldn't save recipe discovery sources", description: (e as Error).message, type: "error" });
    } finally {
      setSavingDiscoverySources(false);
    }
  };

  const saveShowIngredientGramHints = async (value: boolean) => {
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showIngredientGramHints: value }),
      });
      if (!res.ok) throw new Error();
      notifySaved();
      router.refresh();
    } catch {
      toast.add({ title: "Couldn't save settings", type: "error" });
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 md:flex-row md:gap-8">
      <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 md:mx-0 md:w-48 md:shrink-0 md:flex-col md:overflow-visible md:px-0 md:pb-0">
        {visibleCategories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => selectCategory(c.id)}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium whitespace-nowrap transition-colors",
              category === c.id
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            )}
          >
            <c.icon className="size-4 shrink-0" strokeWidth={2} />
            {c.label}
          </button>
        ))}
      </nav>

      <div className="min-w-0 flex-1 pb-16">
        {category === "profile" && (
          <div className="flex flex-col gap-6">
            <SectionCard title="Profile" description="Your name and avatar color.">
              <SettingRow title="Avatar">
                <div className="flex items-center gap-3">
                  <Avatar className="size-9">
                    <AvatarFallback className={cn(color, "font-semibold text-white")}>
                      {name.trim().charAt(0).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-1">
                    {PROFILE_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={c}
                        onClick={() => {
                          setColor(c);
                          saveProfile({ color: c });
                        }}
                        className={cn(
                          "size-5 rounded-full transition-transform hover:scale-110",
                          c,
                          color === c &&
                            "ring-2 ring-foreground ring-offset-2 ring-offset-card"
                        )}
                      />
                    ))}
                  </div>
                </div>
              </SettingRow>
              <SettingRow title="Display name">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => {
                    const trimmed = name.trim();
                    if (trimmed && trimmed !== profile.name) saveProfile({ name: trimmed });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                  className="w-full sm:w-56"
                />
              </SettingRow>
            </SectionCard>

            <SectionCard
              title="Password"
              description={
                profile.hasPassword
                  ? "This profile is locked — switching to it asks for the password below."
                  : "Optionally lock this profile so switching to it asks for a password. Fill in and confirm a new password below to save it."
              }
              footer={
                profile.hasPassword ? (
                  <Button
                    variant="outline"
                    onClick={removePassword}
                    disabled={removingPassword || savingPassword}
                    className="gap-2"
                  >
                    {removingPassword && <Loader2 className="size-4 animate-spin" />}
                    Remove password
                  </Button>
                ) : undefined
              }
            >
              {profile.hasPassword && (
                <SettingRow title="Current password">
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full sm:w-56"
                  />
                </SettingRow>
              )}
              <SettingRow title={profile.hasPassword ? "New password" : "Password"}>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 4 characters"
                  className="w-full sm:w-56"
                />
              </SettingRow>
              <SettingRow title="Confirm password">
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={savePassword}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                  className="w-full sm:w-56"
                />
              </SettingRow>
              {savingPassword && (
                <p className="pb-4 text-xs text-muted-foreground">Saving password…</p>
              )}
            </SectionCard>
          </div>
        )}

        {category === "stats" && <StatsPanel />}

        {category === "theme" && (
          <SectionCard title="Theme" description="Choose how Recipery looks on this device.">
            <SettingRow
              title="Appearance"
              description="System matches your OS/browser setting automatically."
            >
              <div className="flex items-center gap-1 rounded-full border border-border p-1">
                {(
                  [
                    { id: "light", label: "Light" },
                    { id: "dark", label: "Dark" },
                    { id: "system", label: "System" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTheme(opt.id)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                      mounted && theme === opt.id
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </SettingRow>
          </SectionCard>
        )}

        {category === "profiles" && isAdmin && (
          <ManageProfilesPanel
            profiles={profiles}
            activeProfileId={activeProfileId}
            onChanged={() => router.refresh()}
          />
        )}

        {category === "library" && (
          <SectionCard
            title="Library"
            description="Controls pagination and photo uploads in the Library, Favorites, and Collection grids."
          >
            <SettingRow
              title="Max photo size"
              description="Largest hero or step photo accepted by uploads, in MB (1–100)."
            >
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={imageMaxSizeMb}
                  onChange={(e) =>
                    setImageMaxSizeMb(Math.min(100, Math.max(1, Number(e.target.value) || 1)))
                  }
                  onBlur={() => saveImageMaxSizeMb()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">MB</span>
              </div>
            </SettingRow>
            <SettingRow
              title="Recipes per page"
              description="How many recipes to show per page before Previous/Next appears (10–500)."
            >
              <Input
                type="number"
                min={10}
                max={500}
                value={recipesPerPage}
                onChange={(e) =>
                  setRecipesPerPage(Math.min(500, Math.max(10, Number(e.target.value) || 10)))
                }
                onBlur={() => saveRecipesPerPage()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
                className="w-20"
              />
            </SettingRow>
            <SettingRow
              title="Search results"
              description="How many matches the ⌘K search dialog shows before nudging you to narrow the query (1–100)."
            >
              <Input
                type="number"
                min={1}
                max={100}
                value={searchResultLimit}
                onChange={(e) =>
                  setSearchResultLimit(Math.min(100, Math.max(1, Number(e.target.value) || 1)))
                }
                onBlur={() => saveSearchResultLimit()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
                className="w-20"
              />
            </SettingRow>
            <SettingRow
              title="Ingredient gram weights"
              description="Show an approximate gram weight next to ingredient quantities like cups and tablespoons, using a built-in density table. Not exact for every ingredient."
            >
              <Switch
                checked={showIngredientGramHints}
                onCheckedChange={(checked) => {
                  setShowIngredientGramHints(checked);
                  saveShowIngredientGramHints(checked);
                }}
              />
            </SettingRow>
          </SectionCard>
        )}

        {category === "discovery" && (
          <SectionCard
            title="Recipe Discovery"
            description={
              'Sites Discover and Find Similar search. The search URL must include a "{query}" placeholder where the search term goes. The browse URL is optional — a plain link to the site\'s own sorted listing (e.g. most recent or top rated) — and populates Discover before anyone searches.'
            }
            footer={
              <div className="flex w-full items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setDiscoverySources((prev) => [...prev, newDiscoverySource()])}
                >
                  <Plus className="size-3.5" />
                  Add source
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5"
                  disabled={!discoverySourcesDirty || savingDiscoverySources}
                  onClick={saveDiscoverySources}
                >
                  {savingDiscoverySources && <Loader2 className="size-3.5 animate-spin" />}
                  Save changes
                </Button>
              </div>
            }
          >
            {discoverySources.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                No sources yet — add one below (e.g. NYT Cooking or your own favorite recipe site).
              </p>
            ) : (
              <div className="flex flex-col">
                {discoverySources.map((source, index) => {
                  const isDropTarget =
                    dragOverSourceId === source.id && !!draggedSourceId && draggedSourceId !== source.id;
                  return (
                    <div
                      key={source.id}
                      onDragOver={(e) => {
                        if (draggedSourceId) e.preventDefault();
                      }}
                      onDragEnter={() => {
                        if (draggedSourceId && draggedSourceId !== source.id) setDragOverSourceId(source.id);
                      }}
                      onDragLeave={(e) => {
                        // dragenter/dragleave fire when moving onto a child too —
                        // only clear once the pointer actually left the row.
                        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                        setDragOverSourceId((prev) => (prev === source.id ? null : prev));
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedSourceId) reorderDiscoverySources(draggedSourceId, source.id);
                        setDraggedSourceId(null);
                        setDragOverSourceId(null);
                      }}
                      className={cn(
                        "flex flex-col gap-2 py-4 sm:flex-row sm:items-start",
                        index > 0 && "border-t transition-colors duration-150",
                        index > 0 && (isDropTarget ? "border-t-2 border-ring" : "border-border/60"),
                        draggedSourceId === source.id && "opacity-40"
                      )}
                    >
                      <div
                        draggable
                        onDragStart={() => setDraggedSourceId(source.id)}
                        onDragEnd={() => {
                          setDraggedSourceId(null);
                          setDragOverSourceId(null);
                        }}
                        title="Drag to reorder"
                        className="hidden shrink-0 cursor-grab items-center justify-center text-muted-foreground select-none active:cursor-grabbing sm:flex sm:h-9"
                      >
                        <GripVertical className="size-4" />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Input
                            value={source.name}
                            onChange={(e) =>
                              setDiscoverySources((prev) =>
                                prev.map((s) => (s.id === source.id ? { ...s, name: e.target.value } : s))
                              )
                            }
                            placeholder="Name, e.g. NYT Cooking"
                            className="sm:w-40"
                          />
                          <Input
                            value={source.searchUrlTemplate}
                            onChange={(e) =>
                              setDiscoverySources((prev) =>
                                prev.map((s) => (s.id === source.id ? { ...s, searchUrlTemplate: e.target.value } : s))
                              )
                            }
                            placeholder="Search URL, e.g. https://example.com/search?q={query}"
                            className="flex-1"
                          />
                        </div>
                        {expandedBrowseUrlIds.has(source.id) && (
                          <Input
                            value={source.browseUrl ?? ""}
                            onChange={(e) =>
                              setDiscoverySources((prev) =>
                                prev.map((s) => (s.id === source.id ? { ...s, browseUrl: e.target.value } : s))
                              )
                            }
                            placeholder="Browse URL (optional) — e.g. https://example.com/search?sort=recent"
                          />
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1 self-end sm:h-9 sm:self-auto">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedBrowseUrlIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(source.id)) next.delete(source.id);
                              else next.add(source.id);
                              return next;
                            })
                          }
                          aria-label={expandedBrowseUrlIds.has(source.id) ? "Hide browse URL" : "Add a browse URL"}
                          title="Browse URL (optional)"
                          className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                          <ChevronDown
                            className={cn(
                              "size-3.5 transition-transform",
                              expandedBrowseUrlIds.has(source.id) && "rotate-180"
                            )}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDiscoverySources((prev) => prev.filter((s) => s.id !== source.id))}
                          aria-label="Remove source"
                          className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        )}

        {category === "backup" && (
          <SectionCard
            title="Backup"
            description="Download everything — recipes, photos, collections, profiles, and settings — as a zip file."
          >
            <SettingRow
              title="Export your data"
              description={
                DEMO_MODE
                  ? "Backups are disabled on this read-only demo."
                  : "A full backup of this install, for safekeeping or moving to a new server."
              }
            >
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={DEMO_MODE}
                onClick={() => {
                  window.location.href = "/api/export";
                }}
              >
                <Download className="size-3.5" />
                Download backup
              </Button>
            </SettingRow>
          </SectionCard>
        )}
      </div>
    </div>
  );
}
