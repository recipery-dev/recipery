/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useRecipeFilters } from "./use-recipe-filters";
import { EMPTY_RECIPE_FILTERS } from "@/lib/recipes/filter";

beforeEach(() => {
  localStorage.clear();
});

describe("useRecipeFilters", () => {
  it("starts empty when nothing is stored", () => {
    const { result } = renderHook(() => useRecipeFilters("test-filters"));
    expect(result.current[0]).toEqual(EMPTY_RECIPE_FILTERS);
  });

  it("loads a previously stored value on mount", () => {
    const stored = { tags: ["weeknight"], cuisines: [], difficulties: [] };
    localStorage.setItem("test-filters", JSON.stringify(stored));

    const { result } = renderHook(() => useRecipeFilters("test-filters"));
    expect(result.current[0]).toEqual(stored);
  });

  it("persists a change to localStorage under the given key", () => {
    const { result } = renderHook(() => useRecipeFilters("test-filters"));
    const next = { tags: [], cuisines: ["Italian"], difficulties: [] };

    act(() => result.current[1](next));

    expect(result.current[0]).toEqual(next);
    expect(JSON.parse(localStorage.getItem("test-filters")!)).toEqual(next);
  });

  it("falls back to the default when the stored value is malformed JSON", () => {
    localStorage.setItem("test-filters", "{not json");
    const { result } = renderHook(() => useRecipeFilters("test-filters"));
    expect(result.current[0]).toEqual(EMPTY_RECIPE_FILTERS);
  });

  it("keeps working (in-memory) when localStorage throws", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });

    const { result } = renderHook(() => useRecipeFilters("test-filters"));
    const next = { tags: ["quick"], cuisines: [], difficulties: [] };

    act(() => result.current[1](next));
    expect(result.current[0]).toEqual(next);

    setItemSpy.mockRestore();
  });

  it("scopes storage to the given key — two different keys don't collide", () => {
    localStorage.setItem("filters-a", JSON.stringify({ tags: ["a"], cuisines: [], difficulties: [] }));
    localStorage.setItem("filters-b", JSON.stringify({ tags: ["b"], cuisines: [], difficulties: [] }));

    const { result: a } = renderHook(() => useRecipeFilters("filters-a"));
    const { result: b } = renderHook(() => useRecipeFilters("filters-b"));

    expect(a.current[0].tags).toEqual(["a"]);
    expect(b.current[0].tags).toEqual(["b"]);
  });
});
