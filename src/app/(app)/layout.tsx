import { Suspense } from "react";
import { cookies } from "next/headers";
import { readJson } from "@/lib/store";
import type { RecipeRecord } from "@/lib/recipes/types";
import { getActiveProfile, listProfiles } from "@/lib/profiles/store";
import { applyProfileState, getProfileState } from "@/lib/profiles/state";
import { getSettings } from "@/lib/settings/store";
import { toPublicSettings } from "@/lib/settings/types";
import { toPublicProfile } from "@/lib/profiles/types";
import { APP_VERSION } from "@/lib/app-version";
import { LibraryShellProvider } from "@/components/library/library-shell-context";
import { AppShell } from "@/components/library/app-shell";

export const dynamic = "force-dynamic";

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [records, profiles, activeProfile, settings, cookieStore] = await Promise.all([
    readJson<RecipeRecord[]>("index.json").then((r) => r ?? []),
    listProfiles(),
    getActiveProfile(),
    getSettings(),
    cookies(),
  ]);

  const state = await getProfileState(activeProfile.id);
  const recipes = records.map((record) => applyProfileState(record, state[record.id]));
  const sidebarCookie = cookieStore.get("sidebar_state")?.value;
  const sidebarOpen = sidebarCookie === undefined ? true : sidebarCookie === "true";

  return (
    <Suspense>
      <LibraryShellProvider
        key={activeProfile.id}
        initialRecipes={recipes}
        profiles={profiles.map(toPublicProfile)}
        activeProfileId={activeProfile.id}
        settings={toPublicSettings(settings)}
        appVersion={APP_VERSION}
      >
        <AppShell defaultSidebarOpen={sidebarOpen}>{children}</AppShell>
      </LibraryShellProvider>
    </Suspense>
  );
}
