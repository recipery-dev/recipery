/**
 * Searches a configured recipe site for recipes similar to one already in
 * the library ("Find Similar"). There's no shared search API across
 * recipe sites, so this tries a couple of best-effort strategies against
 * whatever HTML the site's search page returns, in order:
 *
 *  1. A `<script id="__NEXT_DATA__">` blob — most Next.js sites (NYT
 *     Cooking, BBC Good Food, and plenty of others) ship the data behind
 *     their server-rendered page this way, but each site nests its result
 *     list under a different key (NYT: `pageProps.results`, BBC Good Food:
 *     `pageProps.searchResults.items`, ...). Rather than hardcode a path
 *     per site, this walks the parsed JSON looking for an array whose
 *     entries mostly look like recipe cards (a title/name plus a url) and
 *     uses the largest one it finds.
 *  2. A generic schema.org `ItemList` in a `<script type="application/
 *     ld+json">` block — a fairly common way for search/category pages
 *     (WordPress recipe plugins, various CMSes) to mark up a list of links
 *     for search engines.
 *
 * Neither is guaranteed to match a given site (some sites also just block
 * non-browser requests outright), so callers should treat a thrown error —
 * or an empty result list — as "couldn't read structured results here" and
 * fall back to linking straight to the search page instead.
 */

import { scrapeUserAgent } from "./scrape";
import type { RecipeDiscoverySource } from "../settings/types";
import type { RecipeRecord } from "./types";

export interface SimilarRecipeResult {
  id: string;
  title: string;
  url: string;
  imageUrl?: string;
  time?: string;
  rating?: number;
}

const NEXT_DATA_PATTERN = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i;
const LD_JSON_PATTERN = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonNode = Record<string, any>;

/** Uses the recipe's own title as the search query — most recipe search
 * engines rank well on full titles, and it's already the best single
 * description of what the recipe is. */
export function buildSimilarSearchQuery(recipe: Pick<RecipeRecord, "title">): string {
  return recipe.title.trim();
}

export function buildSimilarSearchUrl(searchUrlTemplate: string, query: string): string {
  return searchUrlTemplate.replaceAll("{query}", encodeURIComponent(query));
}

function typeIncludes(node: JsonNode, type: string): boolean {
  const t = node["@type"];
  if (!t) return false;
  return Array.isArray(t) ? t.some((x) => String(x).toLowerCase() === type) : String(t).toLowerCase() === type;
}

function normalizeImage(image: unknown): string | undefined {
  if (!image) return undefined;
  if (typeof image === "string") return image;
  if (Array.isArray(image)) return normalizeImage(image[0]);
  if (typeof image === "object") {
    const obj = image as JsonNode;
    if (typeof obj.src?.card === "string") return obj.src.card;
    if (typeof obj.url === "string") return obj.url;
  }
  return undefined;
}

function absoluteUrl(url: string, base: string): string | undefined {
  try {
    return new URL(url, base).toString();
  } catch {
    return undefined;
  }
}

// --- Strategy 1: a __NEXT_DATA__ blob, wherever its result list lives -------

function looksLikeCard(node: unknown): node is JsonNode {
  if (!node || typeof node !== "object") return false;
  const n = node as JsonNode;
  return (typeof n.title === "string" || typeof n.name === "string") && typeof n.url === "string";
}

/** Recursively collects every array in `node` where at least half the
 * elements look like recipe cards, up to a depth of 6 (deep enough for
 * every site seen so far, shallow enough to stay fast on a large blob). */
function collectCardArrays(node: unknown, into: JsonNode[][], depth = 0): void {
  if (depth > 6 || !node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    if (node.length > 0 && node.filter(looksLikeCard).length / node.length >= 0.5) {
      into.push(node as JsonNode[]);
    }
    return;
  }
  for (const value of Object.values(node as JsonNode)) {
    collectCardArrays(value, into, depth + 1);
  }
}

function findLargestCardArray(pageProps: JsonNode): JsonNode[] | null {
  const candidates: JsonNode[][] = [];
  collectCardArrays(pageProps, candidates);
  if (candidates.length === 0) return null;
  return candidates.reduce((largest, current) => (current.length > largest.length ? current : largest));
}

function normalizeNextDataCard(node: JsonNode, baseUrl: string): SimilarRecipeResult | null {
  // Search pages mix recipe cards in with article/roundup cards (marked by
  // `type`/`postType`) — "Find Similar" only wants actual recipes.
  if (node.type === "article" || node.postType === "article") return null;

  const title = String(node.title ?? node.name ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!title) return null;

  const url = typeof node.url === "string" ? absoluteUrl(node.url, baseUrl) : undefined;
  if (!url) return null;

  const time =
    typeof node.time === "string"
      ? node.time
      : Array.isArray(node.terms)
        ? (node.terms.find((t: unknown) => (t as JsonNode)?.slug === "time")?.display as string | undefined)
        : undefined;

  const rating =
    typeof node.ratings?.avgRating === "number"
      ? node.ratings.avgRating
      : typeof node.rating?.ratingValue === "number"
        ? node.rating.ratingValue
        : undefined;

  return {
    id: String(node.id ?? url),
    title,
    url,
    imageUrl: normalizeImage(node.image),
    time,
    rating,
  };
}

function parseNextDataResults(html: string, baseUrl: string): SimilarRecipeResult[] {
  const match = html.match(NEXT_DATA_PATTERN);
  if (!match) return [];

  let data: unknown;
  try {
    data = JSON.parse(match[1]);
  } catch {
    return [];
  }

  const pageProps = (data as JsonNode)?.props?.pageProps;
  if (!pageProps || typeof pageProps !== "object") return [];

  const cards = findLargestCardArray(pageProps);
  if (!cards) return [];

  return cards
    .map((c) => normalizeNextDataCard(c, baseUrl))
    .filter((r): r is SimilarRecipeResult => r !== null);
}

// --- Strategy 2: a generic schema.org ItemList -------------------------------

function urlSlug(url: string): string | undefined {
  try {
    return new URL(url).pathname.split("/").filter(Boolean).pop();
  } catch {
    return undefined;
  }
}

/** Some sites' ItemList markup is just a bare list of URLs for search-engine
 * crawling, with no `name` for display (e.g. bbc.co.uk/food). Falls back to
 * a guess built from the URL's last path segment so the item still shows up
 * with something recognizable — the real title still comes through once the
 * user opens the preview drawer and it's actually scraped from the page. */
function humanizeSlugTitle(url: string): string | undefined {
  const slug = urlSlug(url);
  if (!slug) return undefined;
  const words = slug
    .replace(/[-_]\d+$/, "")
    .split(/[-_]+/)
    .filter(Boolean);
  if (words.length === 0) return undefined;
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/** Finds a plain `<img src="...">` on the page whose URL contains the given
 * slug — some sites' ItemList entries carry neither a name nor an image
 * (e.g. bbc.co.uk/food), but still render a thumbnail per card with a src
 * that matches the same slug as the recipe's own URL. */
function findImageForSlug(html: string, slug: string): string | undefined {
  const escaped = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(new RegExp(`<img[^>]+src=["']([^"']*${escaped}[^"']*)["']`, "i"));
  return match?.[1];
}

function normalizeItemListElement(element: JsonNode, baseUrl: string, html: string): SimilarRecipeResult | null {
  const item = element.item && typeof element.item === "object" ? (element.item as JsonNode) : element;
  const rawUrl = typeof item.url === "string" ? item.url : typeof element.url === "string" ? element.url : undefined;
  if (!rawUrl) return null;

  const url = absoluteUrl(rawUrl, baseUrl);
  if (!url) return null;

  const name = typeof item.name === "string" ? item.name : typeof element.name === "string" ? element.name : undefined;
  const title = name?.trim() || humanizeSlugTitle(url);
  if (!title) return null;

  const slug = urlSlug(url);
  const imageUrl = normalizeImage(item.image ?? element.image) ?? (slug ? findImageForSlug(html, slug) : undefined);

  return { id: url, title, url, imageUrl };
}

function collectItemLists(node: unknown, into: JsonNode[]): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((n) => collectItemLists(n, into));
    return;
  }
  const obj = node as JsonNode;
  if (typeIncludes(obj, "itemlist") && Array.isArray(obj.itemListElement)) into.push(obj);
  if (Array.isArray(obj["@graph"])) collectItemLists(obj["@graph"], into);
  if (Array.isArray(obj.mainEntity)) collectItemLists(obj.mainEntity, into);
}

function parseItemListResults(html: string, baseUrl: string): SimilarRecipeResult[] {
  const lists: JsonNode[] = [];
  for (const match of html.matchAll(LD_JSON_PATTERN)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(match[1].trim());
    } catch {
      continue;
    }
    collectItemLists(parsed, lists);
  }

  return lists
    .flatMap((list) => list.itemListElement as unknown[])
    .map((el) => normalizeItemListElement(el as JsonNode, baseUrl, html))
    .filter((r): r is SimilarRecipeResult => r !== null);
}

/** Shared by search and browse — reads whatever structured listing data the
 * page ships, trying the `__NEXT_DATA__` strategy before the generic
 * `ItemList` one. Returns an empty array (never throws) when neither finds
 * anything, so callers can phrase their own "couldn't find results" error. */
function parseListingHtml(html: string, baseUrl: string): SimilarRecipeResult[] {
  const nextDataResults = parseNextDataResults(html, baseUrl);
  if (nextDataResults.length > 0) return nextDataResults;
  return parseItemListResults(html, baseUrl);
}

export async function searchRecipeSource(
  source: RecipeDiscoverySource,
  query: string
): Promise<SimilarRecipeResult[]> {
  const searchUrl = buildSimilarSearchUrl(source.searchUrlTemplate, query);
  const res = await fetch(searchUrl, { headers: { "User-Agent": scrapeUserAgent() } });
  if (!res.ok) throw new Error(`Couldn't search ${source.name} (HTTP ${res.status})`);
  const html = await res.text();

  const results = parseListingHtml(html, searchUrl);
  if (results.length > 0) return results;

  throw new Error(`Couldn't read structured results from ${source.name} — try opening the search directly.`);
}

/** Populates Discover with the source's own default/sorted listing (e.g.
 * "most recent") before the user has searched for anything — see
 * `RecipeDiscoverySource.browseUrl`. */
export async function browseRecipeSource(source: RecipeDiscoverySource): Promise<SimilarRecipeResult[]> {
  if (!source.browseUrl) {
    throw new Error(`${source.name} doesn't have a default listing configured.`);
  }
  const res = await fetch(source.browseUrl, { headers: { "User-Agent": scrapeUserAgent() } });
  if (!res.ok) throw new Error(`Couldn't load ${source.name} (HTTP ${res.status})`);
  const html = await res.text();

  const results = parseListingHtml(html, source.browseUrl);
  if (results.length > 0) return results;

  throw new Error(`Couldn't read structured results from ${source.name}.`);
}

export interface DiscoverFeedResult {
  results: SimilarRecipeResult[];
  /** Names of sources that were tried but didn't return anything — a soft
   * signal for callers, not necessarily an error (some sources succeeding
   * is treated as an overall success). */
  failedSources: string[];
}

/** Interleaves several sources' result lists round-robin instead of just
 * concatenating them, so the merged feed isn't dominated by whichever site
 * happens to be listed first. */
function interleave(lists: SimilarRecipeResult[][]): SimilarRecipeResult[] {
  const out: SimilarRecipeResult[] = [];
  const max = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < max; i++) {
    for (const list of lists) {
      if (list[i]) out.push(list[i]);
    }
  }
  return out;
}

function collectFeedResult(
  sources: RecipeDiscoverySource[],
  settled: PromiseSettledResult<SimilarRecipeResult[]>[]
): DiscoverFeedResult {
  const lists: SimilarRecipeResult[][] = [];
  const failedSources: string[] = [];
  settled.forEach((outcome, i) => {
    if (outcome.status === "fulfilled") lists.push(outcome.value);
    else failedSources.push(sources[i].name);
  });
  return { results: interleave(lists), failedSources };
}

/** Discover's unified feed: searches every configured source in parallel
 * and merges the results — no per-source tabs, one combined list. */
export async function searchAllSources(
  sources: RecipeDiscoverySource[],
  query: string
): Promise<DiscoverFeedResult> {
  const settled = await Promise.allSettled(sources.map((s) => searchRecipeSource(s, query)));
  return collectFeedResult(sources, settled);
}

/** Discover's unified browse feed — only sources with a `browseUrl` take
 * part; sources without one are silently skipped, not counted as failures. */
export async function browseAllSources(sources: RecipeDiscoverySource[]): Promise<DiscoverFeedResult> {
  const browsable = sources.filter((s) => s.browseUrl);
  const settled = await Promise.allSettled(browsable.map((s) => browseRecipeSource(s)));
  return collectFeedResult(browsable, settled);
}
