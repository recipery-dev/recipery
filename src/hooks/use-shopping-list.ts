"use client";

import * as React from "react";
import { toast } from "@/components/ui/toast";
import { EMPTY_SHOPPING_LIST, type ShoppingList } from "@/lib/shopping-list";

async function fetchShoppingList(): Promise<ShoppingList> {
  const res = await fetch("/api/shopping-list");
  if (!res.ok) return EMPTY_SHOPPING_LIST;
  const data = await res.json();
  return data.shoppingList as ShoppingList;
}

/**
 * Bucket-backed shopping list, scoped per profile server-side (via the
 * active profile cookie). Mutations apply optimistically for a snappy UI;
 * on failure the change is rolled back by refetching the server's actual
 * state, mirroring useCollections.
 */
export function useShoppingList(profileId: string) {
  const [shoppingList, setShoppingList] = React.useState<ShoppingList>(EMPTY_SHOPPING_LIST);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    fetchShoppingList().then((next) => {
      if (cancelled) return;
      setShoppingList(next);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  const resync = React.useCallback(async (message: string) => {
    toast.add({ title: message, type: "error" });
    setShoppingList(await fetchShoppingList());
  }, []);

  const addRecipe = React.useCallback(
    (recipeId: string) => {
      setShoppingList((prev) =>
        prev.recipeIds.includes(recipeId) ? prev : { ...prev, recipeIds: [...prev.recipeIds, recipeId] }
      );
      void (async () => {
        const res = await fetch("/api/shopping-list/recipes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipeId }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          await resync(data.error ?? "Couldn't add to shopping list");
        }
      })();
    },
    [resync]
  );

  const removeRecipe = React.useCallback(
    (recipeId: string) => {
      setShoppingList((prev) => ({ ...prev, recipeIds: prev.recipeIds.filter((id) => id !== recipeId) }));
      void (async () => {
        const res = await fetch(`/api/shopping-list/recipes/${recipeId}`, { method: "DELETE" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          await resync(data.error ?? "Couldn't remove from shopping list");
        }
      })();
    },
    [resync]
  );

  const clearList = React.useCallback(() => {
    setShoppingList(EMPTY_SHOPPING_LIST);
    void (async () => {
      const res = await fetch("/api/shopping-list", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        await resync(data.error ?? "Couldn't clear shopping list");
      }
    })();
  }, [resync]);

  const toggleChecked = React.useCallback(
    (key: string) => {
      let nextChecked: string[] = [];
      setShoppingList((prev) => {
        nextChecked = prev.checkedOff.includes(key)
          ? prev.checkedOff.filter((k) => k !== key)
          : [...prev.checkedOff, key];
        return { ...prev, checkedOff: nextChecked };
      });
      void (async () => {
        const res = await fetch("/api/shopping-list/checked", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checkedOff: nextChecked }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          await resync(data.error ?? "Couldn't update shopping list");
        }
      })();
    },
    [resync]
  );

  return { shoppingList, loaded, addRecipe, removeRecipe, clearList, toggleChecked };
}
