import { describe, it, expect, vi, afterEach } from "vitest";
import { extractBalancedJson, parseDescriptionForRecipe, parseIsoDurationMinutes, scrapeRecipeFromUrl } from "./scrape";

describe("parseIsoDurationMinutes", () => {
  it("parses hours and minutes", () => {
    expect(parseIsoDurationMinutes("PT1H30M")).toBe(90);
    expect(parseIsoDurationMinutes("PT15M")).toBe(15);
    expect(parseIsoDurationMinutes("PT2H")).toBe(120);
  });

  it("returns undefined for a zero or missing duration", () => {
    expect(parseIsoDurationMinutes(undefined)).toBeUndefined();
    expect(parseIsoDurationMinutes("PT0M")).toBeUndefined();
  });

  it("returns undefined for a string that isn't an ISO-8601 duration", () => {
    expect(parseIsoDurationMinutes("30 minutes")).toBeUndefined();
  });
});

describe("extractBalancedJson", () => {
  it("extracts a simple object following the marker", () => {
    const html = `<script>var x = {"a":1,"b":2};</script>`;
    expect(extractBalancedJson(html, "var x = ")).toBe('{"a":1,"b":2}');
  });

  it("handles nested objects", () => {
    const html = `var x = {"a":{"b":{"c":1}}};`;
    expect(extractBalancedJson(html, "var x = ")).toBe('{"a":{"b":{"c":1}}}');
  });

  it("isn't fooled by braces or a literal '};' inside string values", () => {
    const html = String.raw`var x = {"desc":"Recipe here (see notes) — code snippet: fn() {};","n":1};`;
    const json = extractBalancedJson(html, "var x = ");
    expect(json).not.toBeNull();
    expect(JSON.parse(json!)).toEqual({
      desc: "Recipe here (see notes) — code snippet: fn() {};",
      n: 1,
    });
  });

  it("handles escaped quotes inside strings", () => {
    const html = String.raw`var x = {"title":"Sally\"s Kitchen"};`;
    const json = extractBalancedJson(html, "var x = ");
    expect(JSON.parse(json!)).toEqual({ title: 'Sally"s Kitchen' });
  });

  it("returns null when the marker isn't found", () => {
    expect(extractBalancedJson("<html></html>", "var x = ")).toBeNull();
  });

  it("returns null when the marker isn't immediately followed by an object", () => {
    expect(extractBalancedJson("var x = null;", "var x = ")).toBeNull();
  });
});

describe("parseDescriptionForRecipe", () => {
  it("pulls ingredients and steps out of a real cooking-channel description, ignoring the rest", () => {
    const description = [
      "Add a taste of luxury to your morning ☕",
      "#BlueberryDanish",
      "Highly recommend watching my homemade croissant video before this",
      "https://youtu.be/FsgWXCnT8yE",
      "",
      "Timestamps",
      "00:34 Sweet croissant dough",
      "01:34 Butter slab",
      "",
      "Sweet croissant dough",
      "500g Plain flour",
      "10g dry yeast (instant, not active)",
      "200g Water",
      "1 Vanilla bean",
      "",
      "1. Preheat the oven to 200C",
      "2) Roll out the dough",
    ].join("\n");

    expect(parseDescriptionForRecipe(description)).toEqual({
      ingredients: [
        { quantity: "500", unit: "g", name: "Plain flour" },
        { quantity: "10", unit: "g", name: "dry yeast (instant, not active)" },
        { quantity: "200", unit: "g", name: "Water" },
        { quantity: "1", name: "Vanilla bean" },
      ],
      steps: ["Preheat the oven to 200C", "Roll out the dough"],
    });
  });

  it("returns empty arrays when nothing looks like a recipe", () => {
    const description = "Thanks for watching! Subscribe for more.\nhttps://example.com/merch";
    expect(parseDescriptionForRecipe(description)).toEqual({ ingredients: [], steps: [] });
  });

  it("doesn't mistake a timestamp for an ingredient quantity", () => {
    const { ingredients } = parseDescriptionForRecipe("12:34 Final plating");
    expect(ingredients).toEqual([]);
  });
});

describe("scrapeRecipeFromUrl — YouTube", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubYouTubeFetch(options: { oembedOk?: boolean; watchPageBody?: string | null }) {
    const { oembedOk = true, watchPageBody } = options;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url.includes("/oembed")) {
          if (!oembedOk) return new Response("", { status: 404 });
          return new Response(
            JSON.stringify({
              title: "Blueberry croissant Danish",
              author_name: "Benny's baked",
              thumbnail_url: "https://i.ytimg.com/vi/abc123/hqdefault.jpg",
            }),
            { status: 200 }
          );
        }
        // The watch page request.
        if (watchPageBody === null) return new Response("", { status: 500 });
        return new Response(watchPageBody ?? "<html></html>", { status: 200 });
      })
    );
  }

  it("uses oEmbed for title/source/thumbnail and pulls ingredients out of the description", async () => {
    const watchPageBody = `<html><script>var ytInitialPlayerResponse = ${JSON.stringify({
      videoDetails: { shortDescription: "500g Plain flour\n1 egg\nhttps://example.com/link" },
    })};</script></html>`;
    stubYouTubeFetch({ watchPageBody });

    const result = await scrapeRecipeFromUrl("https://www.youtube.com/watch?v=abc123");

    expect(result.title).toBe("Blueberry croissant Danish");
    expect(result.source).toBe("Benny's baked");
    expect(result.sourceUrl).toBe("https://www.youtube.com/watch?v=abc123");
    expect(result.videoUrl).toBe("https://www.youtube.com/watch?v=abc123");
    expect(result.imageUrl).toBe("https://img.youtube.com/vi/abc123/mqdefault.jpg");
    expect(result.ingredients).toEqual([
      { quantity: "500", unit: "g", name: "Plain flour" },
      { quantity: "1", name: "egg" },
    ]);
    expect(result.description).toMatch(/double-check/i);
  });

  it("falls back to an empty recipe with a generic note when the watch page can't be read", async () => {
    stubYouTubeFetch({ watchPageBody: null });

    const result = await scrapeRecipeFromUrl("https://www.youtube.com/watch?v=abc123");

    expect(result.ingredients).toEqual([]);
    expect(result.steps).toEqual([]);
    expect(result.description).toMatch(/add ingredients and steps/i);
    // A failed watch-page fetch shouldn't fail the whole import.
    expect(result.title).toBe("Blueberry croissant Danish");
  });

  it("throws when the video can't be found via oEmbed", async () => {
    stubYouTubeFetch({ oembedOk: false });

    await expect(scrapeRecipeFromUrl("https://www.youtube.com/watch?v=doesnotexist")).rejects.toThrow(
      /couldn't find that youtube video/i
    );
  });
});
