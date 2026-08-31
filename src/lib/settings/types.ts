export interface AppSettings {
  /** how many recipes the Library/Favorites grids show per page */
  recipesPerPage: number;
  /** how many results the ⌘K search dialog shows before "keep typing to narrow it down" */
  searchResultLimit: number;
  /** largest photo accepted by uploads (hero image or step photo), in MB */
  imageMaxSizeMb: number;
  /** show an approximate gram weight next to convertible ingredient quantities */
  showIngredientGramHints: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  recipesPerPage: 50,
  searchResultLimit: 10,
  imageMaxSizeMb: 10,
  showIngredientGramHints: false,
};

/** Settings the client is allowed to see — currently identical to AppSettings. */
export type PublicAppSettings = AppSettings;

export function toPublicSettings(settings: AppSettings): PublicAppSettings {
  return settings;
}
