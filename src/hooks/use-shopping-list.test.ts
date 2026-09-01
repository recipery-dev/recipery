/** @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useShoppingList } from "./use-shopping-list";

vi.mock("@/components/ui/toast", () => ({ toast: { add: vi.fn() } }));

function jsonResponse(body: unknown, ok = true, status = ok ? 200 : 500) {
  return new Response(JSON.stringify(body), { status });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useShoppingList", () => {
  it("loads the shopping list on mount and flips loaded to true", async () => {
    const shoppingList = { recipeIds: ["dracula-cake"], checkedOff: [] };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ shoppingList })));

    const { result } = renderHook(() => useShoppingList("profile-1"));
    expect(result.current.loaded).toBe(false);

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.shoppingList).toEqual(shoppingList);
  });

  it("adds a recipe optimistically and doesn't duplicate an already-added one", async () => {
    const shoppingList = { recipeIds: ["dracula-cake"], checkedOff: [] };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ shoppingList })) // initial load
      .mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useShoppingList("profile-1"));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    act(() => result.current.addRecipe("dracula-cake"));
    expect(result.current.shoppingList.recipeIds).toEqual(["dracula-cake"]);

    act(() => result.current.addRecipe("blueberry-danish"));
    expect(result.current.shoppingList.recipeIds).toEqual(["dracula-cake", "blueberry-danish"]);
  });

  it("rolls back to the server's state when adding fails", async () => {
    const shoppingList = { recipeIds: [], checkedOff: [] };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ shoppingList })) // initial load
      .mockResolvedValueOnce(jsonResponse({ error: "nope" }, false)) // POST fails
      .mockResolvedValueOnce(jsonResponse({ shoppingList })); // resync refetch
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useShoppingList("profile-1"));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    act(() => result.current.addRecipe("dracula-cake"));
    expect(result.current.shoppingList.recipeIds).toEqual(["dracula-cake"]);

    await waitFor(() => expect(result.current.shoppingList.recipeIds).toEqual([]));
  });

  it("removes a recipe optimistically", async () => {
    const shoppingList = { recipeIds: ["dracula-cake", "blueberry-danish"], checkedOff: [] };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ shoppingList }))
      .mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useShoppingList("profile-1"));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    act(() => result.current.removeRecipe("dracula-cake"));
    expect(result.current.shoppingList.recipeIds).toEqual(["blueberry-danish"]);
  });

  it("clears the whole list optimistically", async () => {
    const shoppingList = { recipeIds: ["dracula-cake"], checkedOff: ["dracula-cake:flour"] };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ shoppingList }))
      .mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useShoppingList("profile-1"));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    act(() => result.current.clearList());
    expect(result.current.shoppingList).toEqual({ recipeIds: [], checkedOff: [] });
  });

  it("toggles a checked-off key on and back off", async () => {
    const shoppingList = { recipeIds: ["dracula-cake"], checkedOff: [] };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ shoppingList }))
      .mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useShoppingList("profile-1"));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    act(() => result.current.toggleChecked("dracula-cake:flour"));
    expect(result.current.shoppingList.checkedOff).toEqual(["dracula-cake:flour"]);

    act(() => result.current.toggleChecked("dracula-cake:flour"));
    expect(result.current.shoppingList.checkedOff).toEqual([]);
  });
});
