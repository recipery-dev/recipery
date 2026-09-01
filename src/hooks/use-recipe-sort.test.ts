/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useRecipeSort } from "./use-recipe-sort";

beforeEach(() => {
  localStorage.clear();
});

describe("useRecipeSort", () => {
  it("starts with the given default when nothing is stored", () => {
    const { result } = renderHook(() => useRecipeSort("test-sort", "recent"));
    expect(result.current[0]).toBe("recent");
  });

  it("loads a previously stored sort on mount, overriding the default", () => {
    localStorage.setItem("test-sort", "rating");
    const { result } = renderHook(() => useRecipeSort("test-sort", "recent"));
    expect(result.current[0]).toBe("rating");
  });

  it("persists a change to localStorage under the given key", () => {
    const { result } = renderHook(() => useRecipeSort("test-sort", "recent"));

    act(() => result.current[1]("title"));

    expect(result.current[0]).toBe("title");
    expect(localStorage.getItem("test-sort")).toBe("title");
  });

  it("keeps working (in-memory) when localStorage throws", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });

    const { result } = renderHook(() => useRecipeSort("test-sort", "recent"));
    act(() => result.current[1]("cooked"));
    expect(result.current[0]).toBe("cooked");

    setItemSpy.mockRestore();
  });
});
