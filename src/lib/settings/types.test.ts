import { describe, it, expect } from "vitest";
import { parseDiscoverySource, parseDiscoverySources } from "./types";

describe("parseDiscoverySource", () => {
  it("accepts a valid source with no browseUrl", () => {
    expect(
      parseDiscoverySource({
        id: "nyt-cooking",
        name: "NYT Cooking",
        searchUrlTemplate: "https://cooking.nytimes.com/search?q={query}",
      })
    ).toEqual({
      id: "nyt-cooking",
      name: "NYT Cooking",
      searchUrlTemplate: "https://cooking.nytimes.com/search?q={query}",
      browseUrl: undefined,
    });
  });

  it("accepts and preserves a valid browseUrl — the exact field a past bug silently dropped", () => {
    expect(
      parseDiscoverySource({
        id: "nyt-cooking",
        name: "NYT Cooking",
        searchUrlTemplate: "https://cooking.nytimes.com/search?q={query}",
        browseUrl: "https://cooking.nytimes.com/search?sort=firstPublished&type=recipe",
      })
    ).toEqual({
      id: "nyt-cooking",
      name: "NYT Cooking",
      searchUrlTemplate: "https://cooking.nytimes.com/search?q={query}",
      browseUrl: "https://cooking.nytimes.com/search?sort=firstPublished&type=recipe",
    });
  });

  it("trims whitespace on every field", () => {
    expect(
      parseDiscoverySource({
        id: " nyt-cooking ",
        name: " NYT Cooking ",
        searchUrlTemplate: " https://cooking.nytimes.com/search?q={query} ",
        browseUrl: " https://cooking.nytimes.com/search?sort=firstPublished ",
      })
    ).toEqual({
      id: "nyt-cooking",
      name: "NYT Cooking",
      searchUrlTemplate: "https://cooking.nytimes.com/search?q={query}",
      browseUrl: "https://cooking.nytimes.com/search?sort=firstPublished",
    });
  });

  it("treats an empty-string browseUrl as unset rather than an empty string", () => {
    const result = parseDiscoverySource({
      id: "nyt-cooking",
      name: "NYT Cooking",
      searchUrlTemplate: "https://cooking.nytimes.com/search?q={query}",
      browseUrl: "   ",
    });
    expect(result?.browseUrl).toBeUndefined();
  });

  it("rejects a missing name", () => {
    expect(
      parseDiscoverySource({ id: "x", name: "", searchUrlTemplate: "https://example.com/search?q={query}" })
    ).toBeNull();
  });

  it("rejects a search URL without a {query} placeholder", () => {
    expect(
      parseDiscoverySource({ id: "x", name: "Example", searchUrlTemplate: "https://example.com/search" })
    ).toBeNull();
  });

  it("rejects a non-http(s) search URL", () => {
    expect(
      parseDiscoverySource({ id: "x", name: "Example", searchUrlTemplate: "ftp://example.com/{query}" })
    ).toBeNull();
  });

  it("rejects an invalid browseUrl even when the rest of the source is valid", () => {
    expect(
      parseDiscoverySource({
        id: "x",
        name: "Example",
        searchUrlTemplate: "https://example.com/search?q={query}",
        browseUrl: "not a url",
      })
    ).toBeNull();
  });

  it("rejects non-object input", () => {
    expect(parseDiscoverySource(null)).toBeNull();
    expect(parseDiscoverySource("nope")).toBeNull();
    expect(parseDiscoverySource(42)).toBeNull();
  });
});

describe("parseDiscoverySources", () => {
  it("parses a list of valid sources", () => {
    const result = parseDiscoverySources([
      { id: "a", name: "A", searchUrlTemplate: "https://a.example.com/search?q={query}" },
      {
        id: "b",
        name: "B",
        searchUrlTemplate: "https://b.example.com/search?q={query}",
        browseUrl: "https://b.example.com/browse",
      },
    ]);
    expect(result).toEqual([
      { id: "a", name: "A", searchUrlTemplate: "https://a.example.com/search?q={query}", browseUrl: undefined },
      {
        id: "b",
        name: "B",
        searchUrlTemplate: "https://b.example.com/search?q={query}",
        browseUrl: "https://b.example.com/browse",
      },
    ]);
  });

  it("returns null (rejecting the whole batch) when any single entry is invalid", () => {
    const result = parseDiscoverySources([
      { id: "a", name: "A", searchUrlTemplate: "https://a.example.com/search?q={query}" },
      { id: "b", name: "B", searchUrlTemplate: "not-a-valid-template" },
    ]);
    expect(result).toBeNull();
  });

  it("returns null for non-array input", () => {
    expect(parseDiscoverySources("not an array")).toBeNull();
    expect(parseDiscoverySources(null)).toBeNull();
  });

  it("returns an empty array for an empty list", () => {
    expect(parseDiscoverySources([])).toEqual([]);
  });
});
