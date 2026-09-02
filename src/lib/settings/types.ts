export interface RecipeDiscoverySource {
  id: string;
  name: string;
  /** Search URL with a literal "{query}" placeholder, e.g. "https://cooking.nytimes.com/search?q={query}" */
  searchUrlTemplate: string;
}

export interface AppSettings {
  /** how many recipes the Library/Favorites grids show per page */
  recipesPerPage: number;
  /** how many results the ⌘K search dialog shows before "keep typing to narrow it down" */
  searchResultLimit: number;
  /** largest photo accepted by uploads (hero image or step photo), in MB */
  imageMaxSizeMb: number;
  /** show an approximate gram weight next to convertible ingredient quantities */
  showIngredientGramHints: boolean;
  /** sites "Find Similar" can search for recipes like the one being viewed */
  recipeDiscoverySources: RecipeDiscoverySource[];
}

export const DEFAULT_RECIPE_DISCOVERY_SOURCES: RecipeDiscoverySource[] = [
  {
    id: "nyt-cooking",
    name: "NYT Cooking",
    searchUrlTemplate: "https://cooking.nytimes.com/search?q={query}&type=recipe",
  },
  {
    id: "bbc-good-food",
    name: "BBC Good Food",
    searchUrlTemplate: "https://www.bbcgoodfood.com/search?q={query}",
  },
  {
    id: "bbc-food",
    name: "BBC Food",
    searchUrlTemplate: "https://www.bbc.co.uk/food/search?q={query}",
  },
];

export const DEFAULT_SETTINGS: AppSettings = {
  recipesPerPage: 50,
  searchResultLimit: 10,
  imageMaxSizeMb: 10,
  showIngredientGramHints: false,
  recipeDiscoverySources: DEFAULT_RECIPE_DISCOVERY_SOURCES,
};

/** Settings the client is allowed to see — currently identical to AppSettings. */
export type PublicAppSettings = AppSettings;

export function toPublicSettings(settings: AppSettings): PublicAppSettings {
  return settings;
}
