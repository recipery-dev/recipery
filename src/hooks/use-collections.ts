"use client";

import * as React from "react";
import { toast } from "@/components/ui/toast";
import { type Collection } from "@/lib/collections";

async function fetchCollections(): Promise<Collection[]> {
  const res = await fetch("/api/collections");
  if (!res.ok) return [];
  const data = await res.json();
  return data.collections as Collection[];
}

/**
 * Bucket-backed collections, scoped per profile server-side (via the active
 * profile cookie). Mutations apply optimistically for a snappy UI; on
 * failure (e.g. blocked in the read-only demo) the change is rolled back by
 * refetching the server's actual state, so the two can never drift.
 */
export function useCollections(profileId: string) {
  const [collections, setCollections] = React.useState<Collection[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    fetchCollections().then((next) => {
      if (cancelled) return;
      setCollections(next);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  const resync = React.useCallback(async (message: string) => {
    toast.add({ title: message, type: "error" });
    setCollections(await fetchCollections());
  }, []);

  const createCollection = React.useCallback(
    (name: string, color?: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      void (async () => {
        const res = await fetch("/api/collections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed, color }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          await resync(data.error ?? "Couldn't create collection");
          return;
        }
        const { collection } = await res.json();
        setCollections((prev) => [...prev, collection as Collection]);
      })();
    },
    [resync]
  );

  const deleteCollection = React.useCallback(
    (id: string) => {
      setCollections((prev) => prev.filter((collection) => collection.id !== id));
      void (async () => {
        const res = await fetch(`/api/collections/${id}`, { method: "DELETE" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          await resync(data.error ?? "Couldn't delete collection");
        }
      })();
    },
    [resync]
  );

  const renameCollection = React.useCallback(
    (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setCollections((prev) =>
        prev.map((collection) => (collection.id === id ? { ...collection, name: trimmed } : collection))
      );
      void (async () => {
        const res = await fetch(`/api/collections/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          await resync(data.error ?? "Couldn't rename collection");
        }
      })();
    },
    [resync]
  );

  const recolorCollection = React.useCallback(
    (id: string, color: string) => {
      setCollections((prev) =>
        prev.map((collection) => (collection.id === id ? { ...collection, color } : collection))
      );
      void (async () => {
        const res = await fetch(`/api/collections/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ color }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          await resync(data.error ?? "Couldn't recolor collection");
        }
      })();
    },
    [resync]
  );

  const toggleRecipeInCollection = React.useCallback(
    (collectionId: string, recipeId: string) => {
      const collection = collections.find((c) => c.id === collectionId);
      const inCollection = collection?.recipeIds.includes(recipeId) ?? false;

      setCollections((prev) =>
        prev.map((c) =>
          c.id === collectionId
            ? {
                ...c,
                recipeIds: inCollection
                  ? c.recipeIds.filter((id) => id !== recipeId)
                  : [...c.recipeIds, recipeId],
              }
            : c
        )
      );

      void (async () => {
        const res = inCollection
          ? await fetch(`/api/collections/${collectionId}/recipes/${recipeId}`, { method: "DELETE" })
          : await fetch(`/api/collections/${collectionId}/recipes`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ recipeId }),
            });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          await resync(data.error ?? "Couldn't update collection");
        }
      })();
    },
    [collections, resync]
  );

  // Idempotent add (unlike toggle) — the right semantics for a drag-and-drop
  // gesture, where dropping the same recipe on a collection twice shouldn't remove it.
  const addRecipeToCollection = React.useCallback(
    (collectionId: string, recipeId: string) => {
      setCollections((prev) =>
        prev.map((collection) =>
          collection.id === collectionId && !collection.recipeIds.includes(recipeId)
            ? { ...collection, recipeIds: [...collection.recipeIds, recipeId] }
            : collection
        )
      );
      void (async () => {
        const res = await fetch(`/api/collections/${collectionId}/recipes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipeId }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          await resync(data.error ?? "Couldn't add recipe to collection");
        }
      })();
    },
    [resync]
  );

  return {
    collections,
    loaded,
    createCollection,
    deleteCollection,
    renameCollection,
    recolorCollection,
    toggleRecipeInCollection,
    addRecipeToCollection,
  };
}
