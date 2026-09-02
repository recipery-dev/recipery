export interface RecipeDiscoverySource {
  id: string;
  name: string;
  /** Search URL with a literal "{query}" placeholder, e.g. "https://cooking.nytimes.com/search?q={query}" */
  searchUrlTemplate: string;
  /**
   * Optional: a plain URL (no "{query}" placeholder) for the site's own
   * default/sorted listing — e.g. "sort by most recent". Used to populate
   * Discover with a starting set of recipes before the user searches or
   * picks a category. Sources without one just show the type-to-search
   * state until the user searches.
   */
  browseUrl?: string;
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
    searchUrlTemplate: "https://cooking.nytimes.com/search?q={query}",
    browseUrl: "https://cooking.nytimes.com/search?sort=firstPublished&type=recipe",
  },
  {
    id: "bbc-good-food",
    name: "BBC Good Food",
    searchUrlTemplate: "https://www.bbcgoodfood.com/search?q={query}",
    browseUrl: "https://www.bbcgoodfood.com/search?tab=recipe&sort=rating",
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

function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Validates and normalizes a single discovery source from an untrusted PATCH
 * body (POST /api/settings) — a plain object with no guaranteed shape.
 * Returns `null` for anything invalid rather than silently dropping fields,
 * so the route can reject the whole request instead of quietly losing data
 * (a `browseUrl` field being dropped this way is exactly the bug this
 * function replaced).
 */
export function parseDiscoverySource(input: unknown): RecipeDiscoverySource | null {
  if (typeof input !== "object" || input === null) return null;
  const { id, name, searchUrlTemplate, browseUrl } = input as Record<string, unknown>;

  if (typeof id !== "string" || !id.trim()) return null;
  if (typeof name !== "string" || !name.trim()) return null;
  if (typeof searchUrlTemplate !== "string" || !searchUrlTemplate.includes("{query}")) return null;
  if (!isValidHttpUrl(searchUrlTemplate.replace("{query}", "x"))) return null;

  let normalizedBrowseUrl: string | undefined;
  if (browseUrl !== undefined) {
    if (typeof browseUrl !== "string") return null;
    const trimmed = browseUrl.trim();
    if (trimmed) {
      if (!isValidHttpUrl(trimmed)) return null;
      normalizedBrowseUrl = trimmed;
    }
  }

  return {
    id: id.trim(),
    name: name.trim(),
    searchUrlTemplate: searchUrlTemplate.trim(),
    browseUrl: normalizedBrowseUrl,
  };
}

/**
 * Validates and normalizes a whole `recipeDiscoverySources` array from a
 * PATCH body. Returns `null` if any entry is invalid — the caller rejects
 * the request wholesale rather than silently dropping the bad one.
 */
export function parseDiscoverySources(input: unknown): RecipeDiscoverySource[] | null {
  if (!Array.isArray(input)) return null;
  const out: RecipeDiscoverySource[] = [];
  for (const item of input) {
    const parsed = parseDiscoverySource(item);
    if (!parsed) return null;
    out.push(parsed);
  }
  return out;
}
