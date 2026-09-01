/**
 * Best-effort schema.org Recipe scraper. Reads the JSON-LD most recipe
 * sites already embed for Google's rich-results snippets — no HTML
 * parser dependency needed, just a regex scan for <script type=
 * "application/ld+json"> blocks and a JSON.parse.
 */

import { isYouTubeUrl } from "./video";

export interface ScrapedIngredient {
  quantity?: string;
  unit?: string;
  name: string;
}

export interface ScrapedRecipe {
  title: string;
  source?: string;
  sourceUrl: string;
  videoUrl?: string;
  description?: string;
  imageUrl?: string;
  servings?: number;
  prepMinutes?: number;
  cookMinutes?: number;
  cuisine?: string;
  tags: string[];
  ingredients: ScrapedIngredient[];
  steps: string[];
}

interface YouTubeOEmbed {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
}

/** Finds `marker` in `html` and scans forward from there for the JSON value
 * that follows, tracking string/escape state so braces inside string
 * literals (URLs, apostrophes in a video description, etc.) don't throw off
 * the brace count. A plain non-greedy regex like `\{.*?\}` breaks the
 * instant a description contains its own "};" — this doesn't. */
function extractBalancedJson(html: string, marker: string): string | null {
  const start = html.indexOf(marker);
  if (start === -1) return null;
  const objStart = start + marker.length;
  if (html[objStart] !== "{") return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = objStart; i < html.length; i++) {
    const char = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") depth++;
    else if (char === "}") {
      depth--;
      if (depth === 0) return html.slice(objStart, i + 1);
    }
  }
  return null;
}

/** Best-effort read of the video's full description from the watch page —
 * the oEmbed endpoint doesn't include it. Failure here (blocked request,
 * YouTube's markup shifting, a consent interstitial) just means no
 * description text to search for a recipe in, not a failed import. */
async function fetchYouTubeDescription(url: string): Promise<string | undefined> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": scrapeUserAgent(),
        "Accept-Language": "en-US,en;q=0.9",
        // Skips the cookie-consent interstitial some regions get redirected
        // to instead of the actual watch page.
        Cookie: "CONSENT=YES+1",
      },
    });
    if (!res.ok) return undefined;
    const html = await res.text();
    const json = extractBalancedJson(html, "var ytInitialPlayerResponse = ");
    if (!json) return undefined;
    const data = JSON.parse(json) as { videoDetails?: { shortDescription?: string } };
    return data.videoDetails?.shortDescription;
  } catch {
    return undefined;
  }
}

const TIMESTAMP_LINE = /^\d{1,2}:\d{2}(?::\d{2})?\b/;
const URL_LINE = /^https?:\/\//i;
const STEP_LINE = /^(?:step\s*)?\d+[.):]\s+/i;

/** Cooking-channel descriptions often list ingredients (and sometimes
 * numbered steps) alongside timestamps, links, and promo text with no
 * consistent "Ingredients:" heading to anchor on — so instead of looking
 * for a heading, this just classifies the description line by line, reusing
 * the same quantity/unit parsing as the schema.org scraper. Order matters:
 * a numbered step ("1. Preheat the oven") would otherwise also match the
 * ingredient quantity pattern, so the step check runs first and requires
 * punctuation right after the number ("1." / "1)") to tell it apart from an
 * ingredient quantity ("1 cup", "500g").  */
function parseDescriptionForRecipe(description: string): { ingredients: ScrapedIngredient[]; steps: string[] } {
  const ingredients: ScrapedIngredient[] = [];
  const steps: string[] = [];

  for (const raw of description.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || TIMESTAMP_LINE.test(line) || URL_LINE.test(line)) continue;

    const stepMatch = line.match(STEP_LINE);
    if (stepMatch) {
      steps.push(line.slice(stepMatch[0].length).trim());
      continue;
    }

    if (QUANTITY_PATTERN.test(line)) {
      ingredients.push(splitIngredientLine(line));
    }
  }

  return { ingredients, steps };
}

/** YouTube pages don't carry schema.org Recipe markup, so the oEmbed
 * endpoint (title, channel, thumbnail) is the only reliable source — but
 * cooking channels often paste the recipe itself into the description, so
 * that's scanned as a best-effort bonus rather than relied on. */
async function scrapeYouTubeRecipe(url: string): Promise<ScrapedRecipe> {
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  const res = await fetch(oembedUrl, { headers: { "User-Agent": scrapeUserAgent() } });
  if (!res.ok) throw new Error("Couldn't find that YouTube video — check the link.");
  const data = (await res.json()) as YouTubeOEmbed;

  const description = await fetchYouTubeDescription(url);
  const found = description ? parseDescriptionForRecipe(description) : { ingredients: [], steps: [] };

  return {
    title: data.title?.trim() || "Imported Recipe",
    source: data.author_name,
    sourceUrl: url,
    videoUrl: url,
    description:
      found.ingredients.length > 0 || found.steps.length > 0
        ? "Imported from YouTube — double-check the ingredients and steps pulled from the video description."
        : "Imported from YouTube — add ingredients and steps from the video.",
    imageUrl: data.thumbnail_url,
    tags: [],
    ingredients: found.ingredients,
    steps: found.steps,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonLdNode = Record<string, any>;

function scrapeUserAgent(): string {
  const contact = process.env.RECIPERY_CONTACT;
  return `Recipery/1.0 (self-hosted recipe library${contact ? `; ${contact}` : ""})`;
}

function typeIncludes(node: JsonLdNode, type: string): boolean {
  const t = node["@type"];
  if (!t) return false;
  return Array.isArray(t) ? t.some((x) => String(x).toLowerCase() === type) : String(t).toLowerCase() === type;
}

function findRecipeNode(html: string): JsonLdNode | null {
  const scripts = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );

  for (const match of scripts) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(match[1].trim());
    } catch {
      continue;
    }

    const candidates: JsonLdNode[] = Array.isArray(parsed)
      ? parsed
      : typeof parsed === "object" && parsed && "@graph" in parsed
        ? (parsed as JsonLdNode)["@graph"]
        : [parsed as JsonLdNode];

    const recipe = candidates.find((node) => node && typeof node === "object" && typeIncludes(node, "recipe"));
    if (recipe) return recipe;
  }

  return null;
}

function normalizeImage(image: unknown): string | undefined {
  if (!image) return undefined;
  if (typeof image === "string") return image;
  if (Array.isArray(image)) return normalizeImage(image[0]);
  if (typeof image === "object" && "url" in (image as JsonLdNode)) {
    return (image as JsonLdNode).url as string;
  }
  return undefined;
}

function normalizeSource(author: unknown): string | undefined {
  if (!author) return undefined;
  if (typeof author === "string") return author;
  if (Array.isArray(author)) return normalizeSource(author[0]);
  if (typeof author === "object" && "name" in (author as JsonLdNode)) {
    return (author as JsonLdNode).name as string;
  }
  return undefined;
}

const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/** Decodes the handful of HTML entities that show up in meta-tag content
 * attributes (e.g. "Sally&#039;s Baking Addiction") — just numeric
 * references and the common named ones, not a full HTML-entity table. */
function decodeHtmlEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code =
        entity[1]?.toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return NAMED_HTML_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

/** Best-effort <meta property/name="..." content="..."> reader — attribute
 * order varies by site, so this matches the whole tag first. */
function extractMetaContent(html: string, key: string): string | undefined {
  const tagMatch = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*>`, "i"));
  if (!tagMatch) return undefined;
  const contentMatch = tagMatch[0].match(/content=["']([^"']*)["']/i);
  const content = contentMatch?.[1]?.trim();
  return content ? decodeHtmlEntities(content) : undefined;
}

/** Falls back to the bare domain (e.g. "allrecipes.com") when a page has
 * neither an og:site_name meta tag nor a JSON-LD publisher. */
function hostnameLabel(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, "") || undefined;
  } catch {
    return undefined;
  }
}

function normalizeTags(node: JsonLdNode): string[] {
  const tags = new Set<string>();
  const keywords = node.keywords;
  if (typeof keywords === "string") {
    keywords.split(",").forEach((k) => k.trim() && tags.add(k.trim()));
  } else if (Array.isArray(keywords)) {
    keywords.forEach((k) => typeof k === "string" && k.trim() && tags.add(k.trim()));
  }
  const category = node.recipeCategory;
  if (typeof category === "string" && category.trim()) tags.add(category.trim());
  if (Array.isArray(category)) category.forEach((c) => typeof c === "string" && tags.add(c.trim()));
  return Array.from(tags).slice(0, 10);
}

/** ISO-8601 durations like "PT15M" or "PT1H30M" -> whole minutes. */
export function parseIsoDurationMinutes(iso?: string): number | undefined {
  if (!iso) return undefined;
  const match = iso.match(/^P(?:\d+D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:\d+S)?$/i);
  if (!match) return undefined;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const total = hours * 60 + minutes;
  return total > 0 ? total : undefined;
}

function parseYield(recipeYield: unknown): number | undefined {
  const text = Array.isArray(recipeYield) ? recipeYield[0] : recipeYield;
  if (typeof text === "number") return text;
  if (typeof text !== "string") return undefined;
  const match = text.match(/\d+/);
  return match ? Number(match[0]) : undefined;
}

// Matches a unit at the start of the remaining text and normalizes it to the
// same short form the edit form's unit dropdown uses (UNIT_OPTIONS in
// recipe-form-drawer.tsx), so "Tablespoon", "TABLESPOON", "Table Spoon", and
// "tbsp." all land as the recognized "tbsp" option instead of falling back
// to free text. Order matters: longer/more specific patterns are listed
// before shorter ones they could otherwise be mistaken for a prefix of
// (e.g. "lb" must be tried before the bare "l" abbreviation, or "l\.?" would
// match just the "l" in "lb" and leave a stray "b" in the ingredient name).
// `(?=\s|$)` (rather than `\b`) is the boundary check so an optional
// trailing period — "tbsp." — is consumed cleanly instead of being left
// dangling in front of the ingredient name.
const UNIT_ALIASES: { pattern: RegExp; canonical: string }[] = [
  { pattern: /^cups?(?=\s|$)/i, canonical: "cup" },
  { pattern: /^(?:teaspoons?|tea\s*spoons?|tsps?\.?)(?=\s|$)/i, canonical: "tsp" },
  { pattern: /^(?:tablespoons?|table\s*spoons?|tbsps?\.?|tbls?\.?\s*spoons?)(?=\s|$)/i, canonical: "tbsp" },
  { pattern: /^(?:fluid\s*ounces?|fl\.?\s*oz\.?)(?=\s|$)/i, canonical: "fl oz" },
  { pattern: /^(?:ounces?|oz\.?)(?=\s|$)/i, canonical: "oz" },
  { pattern: /^(?:pounds?|lbs?\.?)(?=\s|$)/i, canonical: "lb" },
  { pattern: /^(?:pints?|pts?\.?)(?=\s|$)/i, canonical: "pt" },
  { pattern: /^(?:quarts?|qts?\.?)(?=\s|$)/i, canonical: "qt" },
  { pattern: /^(?:gallons?|gal\.?)(?=\s|$)/i, canonical: "gal" },
  { pattern: /^(?:kilograms?|kgs?\.?)(?=\s|$)/i, canonical: "kg" },
  { pattern: /^(?:milliliters?|millilitres?|mls?\.?)(?=\s|$)/i, canonical: "ml" },
  { pattern: /^(?:liters?|litres?)(?=\s|$)/i, canonical: "l" },
  { pattern: /^(?:grams?|gr\.?)(?=\s|$)/i, canonical: "g" },
  { pattern: /^pinch(?:es)?(?=\s|$)/i, canonical: "pinch" },
  { pattern: /^dash(?:es)?(?=\s|$)/i, canonical: "dash" },
  { pattern: /^cloves?(?=\s|$)/i, canonical: "clove" },
  { pattern: /^cans?(?=\s|$)/i, canonical: "can" },
  { pattern: /^(?:packages?|packs?|pkgs?\.?)(?=\s|$)/i, canonical: "package" },
  { pattern: /^slices?(?=\s|$)/i, canonical: "slice" },
  { pattern: /^sticks?(?=\s|$)/i, canonical: "stick" },
  { pattern: /^(?:pieces?|pcs?\.?)(?=\s|$)/i, canonical: "piece" },
  // Bare single-letter abbreviations last, once every longer word above has
  // had a chance to match — see the note on ordering above.
  { pattern: /^g\.?(?=\s|$)/i, canonical: "g" },
  { pattern: /^l\.?(?=\s|$)/i, canonical: "l" },
];
const QUANTITY_PATTERN = /^(\d+\s+\d+\/\d+|\d+\/\d+|\d*\.?\d+|[¼½¾⅓⅔⅛⅜⅝⅞])\s*/;

function splitIngredientLine(rawLine: string): ScrapedIngredient {
  const line = rawLine.trim();
  const quantityMatch = line.match(QUANTITY_PATTERN);
  if (!quantityMatch) return { name: line };

  const quantity = quantityMatch[1];
  const afterQuantity = line.slice(quantityMatch[0].length).trim();

  for (const { pattern, canonical } of UNIT_ALIASES) {
    const match = afterQuantity.match(pattern);
    if (match) {
      const name = afterQuantity.slice(match[0].length).trim();
      return { quantity, unit: canonical, name: name || afterQuantity };
    }
  }

  return { quantity, name: afterQuantity || line };
}

function normalizeIngredients(list: unknown): ScrapedIngredient[] {
  if (!Array.isArray(list)) return [];
  return list.filter((l): l is string => typeof l === "string" && l.trim().length > 0).map(splitIngredientLine);
}

function flattenInstructions(node: unknown): string[] {
  if (typeof node === "string") {
    // Some sites put the whole instructions blob in one string, newline-separated.
    return node
      .split(/\r?\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (Array.isArray(node)) return node.flatMap(flattenInstructions);
  if (node && typeof node === "object") {
    const obj = node as JsonLdNode;
    if (typeIncludes(obj, "howtosection") && Array.isArray(obj.itemListElement)) {
      return flattenInstructions(obj.itemListElement);
    }
    if (typeof obj.text === "string") return [obj.text.trim()];
    if (typeof obj.name === "string") return [obj.name.trim()];
  }
  return [];
}

export async function scrapeRecipeFromUrl(url: string): Promise<ScrapedRecipe> {
  if (isYouTubeUrl(url)) return scrapeYouTubeRecipe(url);

  const res = await fetch(url, { headers: { "User-Agent": scrapeUserAgent() } });
  if (!res.ok) throw new Error(`Couldn't fetch that page (HTTP ${res.status})`);
  const html = await res.text();

  const node = findRecipeNode(html);
  if (!node) throw new Error("No recipe found on that page — try entering it manually.");

  const title = typeof node.name === "string" ? node.name.trim() : "Imported Recipe";

  // Prefer the site's own name for "source" over a personal author byline —
  // "NYT Cooking" is more useful at a glance than "Sally Smith".
  const source =
    extractMetaContent(html, "og:site_name") ??
    normalizeSource(node.publisher) ??
    normalizeSource(node.author) ??
    hostnameLabel(url);

  return {
    title,
    source,
    sourceUrl: url,
    description: typeof node.description === "string" ? node.description.trim() : undefined,
    imageUrl: normalizeImage(node.image),
    servings: parseYield(node.recipeYield),
    prepMinutes: parseIsoDurationMinutes(node.prepTime),
    cookMinutes: parseIsoDurationMinutes(node.cookTime),
    cuisine: typeof node.recipeCuisine === "string" ? node.recipeCuisine : undefined,
    tags: normalizeTags(node),
    ingredients: normalizeIngredients(node.recipeIngredient),
    steps: flattenInstructions(node.recipeInstructions),
  };
}
