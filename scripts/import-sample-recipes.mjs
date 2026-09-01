#!/usr/bin/env node
// Seeds the local Recipery library with sample recipes for testing.
//
// Reads BBC Good Food's public sitemap for recipe URLs (skipping the
// paywalled /premium/ ones), then imports a random sample through the
// app's own POST /api/recipes/import endpoint — the same path the
// "Import from URL" dialog uses.
//
// Usage:
//   node scripts/import-sample-recipes.mjs [--count=60] [--base-url=http://localhost:3000]

const args = process.argv.slice(2);

function getArg(name, fallback) {
  const prefix = `--${name}=`;
  const found = args.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

const COUNT = parseInt(getArg("count", "60"), 10);
const BASE_URL = getArg(
  "base-url",
  process.env.RECIPERY_BASE_URL || "http://localhost:3000",
);
const REQUEST_TIMEOUT_MS = 15000;
const DELAY_BETWEEN_IMPORTS_MS = 300;

const SITEMAP_INDEX_URL = "https://www.bbcgoodfood.com/sitemap.xml";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ReciperySampleImporter/1.0)" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function extractLocs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

async function collectRecipeUrls(minCount) {
  const indexXml = await fetchText(SITEMAP_INDEX_URL);
  const recipeSitemaps = extractLocs(indexXml).filter((u) => u.endsWith("-recipe.xml"));

  const urls = new Set();
  for (const sitemapUrl of recipeSitemaps) {
    if (urls.size >= minCount * 3) break; // gather extra headroom for dedup/failed fetches
    try {
      const xml = await fetchText(sitemapUrl);
      for (const loc of extractLocs(xml)) {
        if (loc.includes("/recipes/") && !loc.includes("/premium/")) {
          urls.add(loc);
        }
      }
    } catch (err) {
      console.warn(`  ! failed to read sitemap ${sitemapUrl}: ${err.message}`);
    }
  }
  return [...urls];
}

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

async function importRecipe(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}/api/recipes/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, title: data.recipe?.title };
    return { ok: false, error: data.error || `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, error: err.message };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  console.log(`Collecting recipe URLs from BBC Good Food sitemap...`);
  const candidates = await collectRecipeUrls(COUNT);
  console.log(`Found ${candidates.length} candidate recipe URLs.`);

  const sample = shuffle(candidates).slice(0, COUNT);
  console.log(`Importing ${sample.length} recipes into ${BASE_URL} ...\n`);

  let ok = 0;
  let fail = 0;
  for (const [i, url] of sample.entries()) {
    const result = await importRecipe(url);
    const position = `[${i + 1}/${sample.length}]`;
    if (result.ok) {
      ok++;
      console.log(`${position} OK   ${result.title ?? url}`);
    } else {
      fail++;
      console.log(`${position} FAIL ${url} — ${result.error}`);
    }
    await sleep(DELAY_BETWEEN_IMPORTS_MS);
  }

  console.log(`\nDone: ${ok} imported, ${fail} failed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
