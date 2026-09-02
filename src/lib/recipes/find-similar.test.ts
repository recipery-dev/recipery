import { describe, it, expect, vi, afterEach } from "vitest";
import {
  buildSimilarSearchQuery,
  buildSimilarSearchUrl,
  searchRecipeSource,
  browseRecipeSource,
  searchAllSources,
  browseAllSources,
} from "./find-similar";
import type { RecipeDiscoverySource } from "../settings/types";

function nextDataHtml(cards: Array<{ id: string; title: string; url: string }>) {
  return `<html><body><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
    props: { pageProps: { results: cards.map((c) => ({ ...c, type: "recipe" })) } },
  })}</script></body></html>`;
}

const NYT_SOURCE: RecipeDiscoverySource = {
  id: "nyt-cooking",
  name: "NYT Cooking",
  searchUrlTemplate: "https://cooking.nytimes.com/search?q={query}&include_content=articles",
};

describe("buildSimilarSearchQuery", () => {
  it("uses the recipe's title, trimmed", () => {
    expect(buildSimilarSearchQuery({ title: "  Smashed Beef Kebab  " })).toBe("Smashed Beef Kebab");
  });
});

describe("buildSimilarSearchUrl", () => {
  it("replaces the {query} placeholder with an encoded query", () => {
    expect(buildSimilarSearchUrl("https://example.com/search?q={query}", "beef stew")).toBe(
      "https://example.com/search?q=beef%20stew"
    );
  });
});

describe("searchRecipeSource", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubFetch(html: string, status = 200) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(html, { status }))
    );
  }

  it("parses NYT Cooking's __NEXT_DATA__ recipe cards and drops article cards", async () => {
    const html = `<html><body><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
      props: {
        pageProps: {
          results: [
            {
              id: 1026425,
              title: "Smashed Beef Kebab With Cucumber Yogurt ",
              url: "/recipes/1026425-smashed-beef-kebab-with-cucumber-yogurt",
              type: "recipe",
              time: "25 minutes",
              image: { src: { card: "https://static01.nyt.com/image.jpg" } },
              ratings: { avgRating: 5, numRatings: 10740 },
            },
            {
              id: 100000006408165,
              name: "17 St. Patrick's Day Recipes",
              url: "https://cooking.nytimes.com/article/st-patricks-day-recipes",
              type: "article",
            },
          ],
        },
      },
    })}</script></body></html>`;
    stubFetch(html);

    const results = await searchRecipeSource(NYT_SOURCE, "beef");
    expect(results).toEqual([
      {
        id: "1026425",
        title: "Smashed Beef Kebab With Cucumber Yogurt",
        url: "https://cooking.nytimes.com/recipes/1026425-smashed-beef-kebab-with-cucumber-yogurt",
        imageUrl: "https://static01.nyt.com/image.jpg",
        time: "25 minutes",
        rating: 5,
      },
    ]);
  });

  it("finds the results array wherever a __NEXT_DATA__ blob nests it (e.g. BBC Good Food)", async () => {
    const html = `<html><body><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
      props: {
        pageProps: {
          searchResults: {
            items: [
              {
                id: "266533",
                title: "Chinese-style braised beef one-pot",
                url: "https://www.bbcgoodfood.com/recipes/braised-beef-onepot",
                postType: "recipe",
                image: { url: "https://images.immediate.co.uk/beef.jpg" },
                rating: { ratingValue: 4.7, ratingCount: 304 },
                terms: [
                  { slug: "time", display: "6 hrs 10 mins" },
                  { slug: "skillLevel", display: "Easy" },
                ],
              },
              {
                id: "228702",
                title: "Braised beef with ginger",
                url: "https://www.bbcgoodfood.com/recipes/chinese-braised-beef-ginger",
                postType: "recipe",
                image: { url: "https://images.immediate.co.uk/ginger.jpg" },
                rating: { ratingValue: 4.7, ratingCount: 138 },
                terms: [{ slug: "time", display: "3 hrs 35 mins" }],
              },
            ],
          },
        },
      },
    })}</script></body></html>`;
    stubFetch(html);

    const source: RecipeDiscoverySource = {
      id: "bbc-good-food",
      name: "BBC Good Food",
      searchUrlTemplate: "https://www.bbcgoodfood.com/search?q={query}",
    };
    const results = await searchRecipeSource(source, "beef");
    expect(results).toEqual([
      {
        id: "266533",
        title: "Chinese-style braised beef one-pot",
        url: "https://www.bbcgoodfood.com/recipes/braised-beef-onepot",
        imageUrl: "https://images.immediate.co.uk/beef.jpg",
        time: "6 hrs 10 mins",
        rating: 4.7,
      },
      {
        id: "228702",
        title: "Braised beef with ginger",
        url: "https://www.bbcgoodfood.com/recipes/chinese-braised-beef-ginger",
        imageUrl: "https://images.immediate.co.uk/ginger.jpg",
        time: "3 hrs 35 mins",
        rating: 4.7,
      },
    ]);
  });

  it("falls back to a generic schema.org ItemList when there's no __NEXT_DATA__", async () => {
    const html = `<html><body><script type="application/ld+json">${JSON.stringify({
      "@type": "ItemList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          url: "/recipes/beef-stew",
          name: "Beef Stew",
          image: "https://example.com/beef-stew.jpg",
        },
        { "@type": "ListItem", position: 2, item: { url: "/recipes/beef-tacos", name: "Beef Tacos" } },
      ],
    })}</script></body></html>`;
    stubFetch(html);

    const source: RecipeDiscoverySource = {
      id: "example",
      name: "Example Recipes",
      searchUrlTemplate: "https://example.com/search?q={query}",
    };
    const results = await searchRecipeSource(source, "beef");
    expect(results).toEqual([
      {
        id: "https://example.com/recipes/beef-stew",
        title: "Beef Stew",
        url: "https://example.com/recipes/beef-stew",
        imageUrl: "https://example.com/beef-stew.jpg",
      },
      {
        id: "https://example.com/recipes/beef-tacos",
        title: "Beef Tacos",
        url: "https://example.com/recipes/beef-tacos",
        imageUrl: undefined,
      },
    ]);
  });

  it("falls back to a slug-derived title and image for an ItemList with bare URLs (e.g. bbc.co.uk/food)", async () => {
    const cardHtml = (slug: string) =>
      `<a href="https://www.bbc.co.uk/food/recipes/${slug}"><img src="https://ichef.bbci.co.uk/food/ic/food_16x9_832/recipes/${slug}_16x9.jpg"></a>`;
    const html = `<html><body>
      ${cardHtml("roast_beef_dinner_76669")}
      ${cardHtml("slow-cooker_sunday_roast_64729")}
      <script type="application/ld+json">${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "ItemList",
        itemListElement: [
          { "@type": "ListItem", position: 1, url: "https://www.bbc.co.uk/food/recipes/roast_beef_dinner_76669" },
          {
            "@type": "ListItem",
            position: 2,
            url: "https://www.bbc.co.uk/food/recipes/slow-cooker_sunday_roast_64729",
          },
        ],
      })}</script></body></html>`;
    stubFetch(html);

    const source: RecipeDiscoverySource = {
      id: "bbc-food",
      name: "BBC Food",
      searchUrlTemplate: "https://www.bbc.co.uk/food/search?q={query}",
    };
    const results = await searchRecipeSource(source, "beef");
    expect(results).toEqual([
      {
        id: "https://www.bbc.co.uk/food/recipes/roast_beef_dinner_76669",
        title: "Roast Beef Dinner",
        url: "https://www.bbc.co.uk/food/recipes/roast_beef_dinner_76669",
        imageUrl: "https://ichef.bbci.co.uk/food/ic/food_16x9_832/recipes/roast_beef_dinner_76669_16x9.jpg",
      },
      {
        id: "https://www.bbc.co.uk/food/recipes/slow-cooker_sunday_roast_64729",
        title: "Slow Cooker Sunday Roast",
        url: "https://www.bbc.co.uk/food/recipes/slow-cooker_sunday_roast_64729",
        imageUrl: "https://ichef.bbci.co.uk/food/ic/food_16x9_832/recipes/slow-cooker_sunday_roast_64729_16x9.jpg",
      },
    ]);
  });

  it("throws a friendly error when the fetch fails", async () => {
    stubFetch("", 500);
    await expect(searchRecipeSource(NYT_SOURCE, "beef")).rejects.toThrow("Couldn't search NYT Cooking (HTTP 500)");
  });

  it("throws a friendly error when neither strategy finds anything", async () => {
    stubFetch("<html></html>");
    await expect(searchRecipeSource(NYT_SOURCE, "beef")).rejects.toThrow("Couldn't read structured results");
  });
});

describe("browseRecipeSource", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubFetch(html: string, status = 200) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(html, { status }))
    );
  }

  const BROWSABLE_SOURCE: RecipeDiscoverySource = {
    ...NYT_SOURCE,
    browseUrl: "https://cooking.nytimes.com/search?sort=firstPublished&include_content=articles",
  };

  it("parses the source's browse listing the same way as a search", async () => {
    const html = `<html><body><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
      props: {
        pageProps: {
          results: [
            {
              id: 1026425,
              title: "Smashed Beef Kebab With Cucumber Yogurt",
              url: "/recipes/1026425-smashed-beef-kebab-with-cucumber-yogurt",
              type: "recipe",
              time: "25 minutes",
              image: { src: { card: "https://static01.nyt.com/image.jpg" } },
              ratings: { avgRating: 5, numRatings: 10740 },
            },
          ],
        },
      },
    })}</script></body></html>`;
    stubFetch(html);

    const results = await browseRecipeSource(BROWSABLE_SOURCE);
    expect(results).toEqual([
      {
        id: "1026425",
        title: "Smashed Beef Kebab With Cucumber Yogurt",
        url: "https://cooking.nytimes.com/recipes/1026425-smashed-beef-kebab-with-cucumber-yogurt",
        imageUrl: "https://static01.nyt.com/image.jpg",
        time: "25 minutes",
        rating: 5,
      },
    ]);
  });

  it("throws when the source has no browseUrl configured", async () => {
    await expect(browseRecipeSource(NYT_SOURCE)).rejects.toThrow("doesn't have a default listing configured");
  });

  it("throws a friendly error when the fetch fails", async () => {
    stubFetch("", 500);
    await expect(browseRecipeSource(BROWSABLE_SOURCE)).rejects.toThrow("Couldn't load NYT Cooking (HTTP 500)");
  });

  it("throws a friendly error when neither strategy finds anything", async () => {
    stubFetch("<html></html>");
    await expect(browseRecipeSource(BROWSABLE_SOURCE)).rejects.toThrow("Couldn't read structured results");
  });
});

describe("searchAllSources / browseAllSources", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const SOURCE_A: RecipeDiscoverySource = {
    id: "a",
    name: "Source A",
    searchUrlTemplate: "https://a.example.com/search?q={query}",
    browseUrl: "https://a.example.com/browse",
  };
  const SOURCE_B: RecipeDiscoverySource = {
    id: "b",
    name: "Source B",
    searchUrlTemplate: "https://b.example.com/search?q={query}",
    browseUrl: "https://b.example.com/browse",
  };
  const SOURCE_C_NO_BROWSE: RecipeDiscoverySource = {
    id: "c",
    name: "Source C",
    searchUrlTemplate: "https://c.example.com/search?q={query}",
  };

  function stubFetchByHost(byHost: Record<string, { html?: string; status?: number }>) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString();
        const host = new URL(url).hostname;
        const entry = byHost[host];
        if (!entry) return new Response("", { status: 404 });
        return new Response(entry.html ?? "", { status: entry.status ?? 200 });
      })
    );
  }

  it("interleaves results from every source round-robin", async () => {
    stubFetchByHost({
      "a.example.com": {
        html: nextDataHtml([
          { id: "a1", title: "A First", url: "/a1" },
          { id: "a2", title: "A Second", url: "/a2" },
        ]),
      },
      "b.example.com": {
        html: nextDataHtml([{ id: "b1", title: "B First", url: "/b1" }]),
      },
    });

    const { results, failedSources } = await searchAllSources([SOURCE_A, SOURCE_B], "beef");
    expect(results.map((r) => r.id)).toEqual(["a1", "b1", "a2"]);
    expect(failedSources).toEqual([]);
  });

  it("still succeeds with the sources that responded when one fails", async () => {
    stubFetchByHost({
      "a.example.com": {
        html: nextDataHtml([{ id: "a1", title: "A First", url: "/a1" }]),
      },
      "b.example.com": { status: 500 },
    });

    const { results, failedSources } = await searchAllSources([SOURCE_A, SOURCE_B], "beef");
    expect(results.map((r) => r.id)).toEqual(["a1"]);
    expect(failedSources).toEqual(["Source B"]);
  });

  it("lists every source as failed when none respond", async () => {
    stubFetchByHost({
      "a.example.com": { status: 500 },
      "b.example.com": { status: 500 },
    });

    const { results, failedSources } = await searchAllSources([SOURCE_A, SOURCE_B], "beef");
    expect(results).toEqual([]);
    expect(failedSources.sort()).toEqual(["Source A", "Source B"]);
  });

  it("browseAllSources only tries sources with a browseUrl", async () => {
    stubFetchByHost({
      "a.example.com": {
        html: nextDataHtml([{ id: "a1", title: "A First", url: "/a1" }]),
      },
    });

    const { results, failedSources } = await browseAllSources([SOURCE_A, SOURCE_C_NO_BROWSE]);
    expect(results.map((r) => r.id)).toEqual(["a1"]);
    // Source C has no browseUrl — silently skipped, not a failure.
    expect(failedSources).toEqual([]);
  });
});
