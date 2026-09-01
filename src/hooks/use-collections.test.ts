/** @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useCollections } from "./use-collections";
import type { Collection } from "@/lib/collections";

vi.mock("@/components/ui/toast", () => ({ toast: { add: vi.fn() } }));

function jsonResponse(body: unknown, ok = true, status = ok ? 200 : 500) {
  return new Response(JSON.stringify(body), { status });
}

function makeCollection(overrides: Partial<Collection> & { id: string }): Collection {
  return { name: overrides.id, color: "bg-blue-500", recipeIds: [], ...overrides };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useCollections", () => {
  it("loads collections on mount and flips loaded to true", async () => {
    const dinner = makeCollection({ id: "dinner" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ collections: [dinner] })));

    const { result } = renderHook(() => useCollections("profile-1"));
    expect(result.current.loaded).toBe(false);

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.collections).toEqual([dinner]);
  });

  it("does nothing for a blank collection name", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ collections: [] }));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useCollections("profile-1"));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    const callsBefore = fetchMock.mock.calls.length;
    act(() => result.current.createCollection("   "));
    expect(fetchMock.mock.calls.length).toBe(callsBefore);
  });

  it("appends the server's returned collection on a successful create", async () => {
    const created = makeCollection({ id: "weeknight" });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ collections: [] })) // initial load
      .mockResolvedValueOnce(jsonResponse({ collection: created })); // POST /api/collections
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useCollections("profile-1"));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    act(() => result.current.createCollection("weeknight"));
    await waitFor(() => expect(result.current.collections).toEqual([created]));
  });

  it("rolls back to the server's state when create fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ collections: [] })) // initial load
      .mockResolvedValueOnce(jsonResponse({ error: "nope" }, false)) // POST fails
      .mockResolvedValueOnce(jsonResponse({ collections: [] })); // resync refetch
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useCollections("profile-1"));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    act(() => result.current.createCollection("weeknight"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(result.current.collections).toEqual([]);
  });

  it("removes a collection optimistically, before the DELETE resolves", async () => {
    const dinner = makeCollection({ id: "dinner" });
    let resolveDelete!: (value: Response) => void;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ collections: [dinner] })) // initial load
      .mockReturnValueOnce(new Promise<Response>((resolve) => (resolveDelete = resolve))); // DELETE, pending
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useCollections("profile-1"));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    act(() => result.current.deleteCollection("dinner"));
    expect(result.current.collections).toEqual([]);

    resolveDelete(jsonResponse({ ok: true }));
  });

  it("toggles a recipe into and out of a collection", async () => {
    const dinner = makeCollection({ id: "dinner" });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ collections: [dinner] })) // initial load
      .mockResolvedValue(jsonResponse({ ok: true })); // every mutation after
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useCollections("profile-1"));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    act(() => result.current.toggleRecipeInCollection("dinner", "lasagna"));
    expect(result.current.collections[0].recipeIds).toEqual(["lasagna"]);

    act(() => result.current.toggleRecipeInCollection("dinner", "lasagna"));
    expect(result.current.collections[0].recipeIds).toEqual([]);
  });

  it("addRecipeToCollection doesn't duplicate an already-present recipe", async () => {
    const dinner = makeCollection({ id: "dinner", recipeIds: ["lasagna"] });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ collections: [dinner] })) // initial load
      .mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useCollections("profile-1"));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    act(() => result.current.addRecipeToCollection("dinner", "lasagna"));
    expect(result.current.collections[0].recipeIds).toEqual(["lasagna"]);
  });
});
