"use client";

import { SettingsPanel } from "@/components/settings/settings-panel";
import { useLibraryShell } from "@/components/library/library-shell-context";

export function SettingsPage() {
  const { settings, activeProfile } = useLibraryShell();
  return <SettingsPanel settings={settings} profile={activeProfile} />;
}
