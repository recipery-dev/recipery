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
  type: "recipe" | "article";
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
  // Recipe cards usually carry `title`, article/link cards sometimes carry `name` instead.
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
    type: node.type === "article" || node.postType === "article" ? "article" : "recipe",
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

/** Some sites' ItemList markup is just a bare list of URLs for search-engine
 * crawling, with no `name` for display (e.g. bbc.co.uk/food). Falls back to
 * a guess built from the URL's last path segment so the item still shows up
 * with something recognizable — the real title still comes through once the
 * user opens the preview drawer and it's actually scraped from the page. */
function humanizeSlugTitle(url: string): string | undefined {
  let path: string;
  try {
    path = new URL(url).pathname;
  } catch {
    return undefined;
  }
  const slug = path.split("/").filter(Boolean).pop();
  if (!slug) return undefined;
  const words = slug
    .replace(/[-_]\d+$/, "")
    .split(/[-_]+/)
    .filter(Boolean);
  if (words.length === 0) return undefined;
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function normalizeItemListElement(element: JsonNode, baseUrl: string): SimilarRecipeResult | null {
  const item = element.item && typeof element.item === "object" ? (element.item as JsonNode) : element;
  const rawUrl = typeof item.url === "string" ? item.url : typeof element.url === "string" ? element.url : undefined;
  if (!rawUrl) return null;

  const url = absoluteUrl(rawUrl, baseUrl);
  if (!url) return null;

  const name = typeof item.name === "string" ? item.name : typeof element.name === "string" ? element.name : undefined;
  const title = name?.trim() || humanizeSlugTitle(url);
  if (!title) return null;

  return {
    id: url,
    title,
    url,
    type: "recipe",
    imageUrl: normalizeImage(item.image ?? element.image),
  };
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
    .map((el) => normalizeItemListElement(el as JsonNode, baseUrl))
    .filter((r): r is SimilarRecipeResult => r !== null);
}

export async function searchRecipeSource(
  source: RecipeDiscoverySource,
  query: string
): Promise<SimilarRecipeResult[]> {
  const searchUrl = buildSimilarSearchUrl(source.searchUrlTemplate, query);
  const res = await fetch(searchUrl, { headers: { "User-Agent": scrapeUserAgent() } });
  if (!res.ok) throw new Error(`Couldn't search ${source.name} (HTTP ${res.status})`);
  const html = await res.text();

  const nextDataResults = parseNextDataResults(html, searchUrl);
  if (nextDataResults.length > 0) return nextDataResults;

  const itemListResults = parseItemListResults(html, searchUrl);
  if (itemListResults.length > 0) return itemListResults;

  throw new Error(`Couldn't read structured results from ${source.name} — try opening the search directly.`);
}
