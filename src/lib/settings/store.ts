import { mutateJson, readJson } from "@/lib/store";
import { DEFAULT_SETTINGS, type AppSettings } from "./types";

const KEY = "settings.json";

export async function getSettings(): Promise<AppSettings> {
  const stored = await readJson<Partial<AppSettings>>(KEY);
  if (!stored) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...stored };
}

export interface SettingsPatch {
  recipesPerPage?: number;
  searchResultLimit?: number;
  imageMaxSizeMb?: number;
  showIngredientGramHints?: boolean;
}

export async function updateSettings(patch: SettingsPatch): Promise<AppSettings> {
  return mutateJson<AppSettings>(KEY, (current) => {
    const base = current ? { ...DEFAULT_SETTINGS, ...current } : DEFAULT_SETTINGS;
    return { ...base, ...patch };
  });
}
