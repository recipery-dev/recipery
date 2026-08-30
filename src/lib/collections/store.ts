import { mutateJson, readJson } from "@/lib/store";
import { nextCollectionColor, type Collection } from "@/lib/collections";

function keyFor(profileId: string): string {
  return `collections/${profileId}.json`;
}

/** Seeded once per profile on first access so the sidebar isn't empty. */
const DEFAULT_COLLECTION_NAMES = ["Breakfast", "Dinner", "Dessert", "Quick & Easy", "Want to Try"];

function defaultCollections(): Collection[] {
  return DEFAULT_COLLECTION_NAMES.map((name, i) => ({
    id: crypto.randomUUID(),
    name,
    color: nextCollectionColor(i),
    recipeIds: [],
  }));
}

export async function listCollections(profileId: string): Promise<Collection[]> {
  const existing = await readJson<Collection[]>(keyFor(profileId));
  if (existing) return existing;
  return mutateJson<Collection[]>(keyFor(profileId), (current) => current ?? defaultCollections());
}

export async function createCollection(
  profileId: string,
  name: string,
  color?: string
): Promise<Collection> {
  const trimmed = name.trim() || "New Collection";
  const collections = await mutateJson<Collection[]>(keyFor(profileId), (current) => {
    const list = current ?? [];
    const collection: Collection = {
      id: crypto.randomUUID(),
      name: trimmed,
      color: color ?? nextCollectionColor(list.length),
      recipeIds: [],
    };
    return [...list, collection];
  });
  return collections[collections.length - 1];
}

export async function updateCollection(
  profileId: string,
  id: string,
  patch: Partial<Pick<Collection, "name" | "color">>
): Promise<Collection | null> {
  const collections = await mutateJson<Collection[]>(keyFor(profileId), (current) =>
    (current ?? []).map((collection) => (collection.id === id ? { ...collection, ...patch } : collection))
  );
  return collections.find((collection) => collection.id === id) ?? null;
}

export async function deleteCollection(profileId: string, id: string): Promise<void> {
  await mutateJson<Collection[]>(keyFor(profileId), (current) =>
    (current ?? []).filter((collection) => collection.id !== id)
  );
}

/** Idempotent — dropping the same recipe on a collection twice doesn't duplicate it. */
export async function addRecipeToCollection(
  profileId: string,
  collectionId: string,
  recipeId: string
): Promise<Collection[]> {
  return mutateJson<Collection[]>(keyFor(profileId), (current) =>
    (current ?? []).map((collection) =>
      collection.id === collectionId && !collection.recipeIds.includes(recipeId)
        ? { ...collection, recipeIds: [...collection.recipeIds, recipeId] }
        : collection
    )
  );
}

export async function removeRecipeFromCollection(
  profileId: string,
  collectionId: string,
  recipeId: string
): Promise<Collection[]> {
  return mutateJson<Collection[]>(keyFor(profileId), (current) =>
    (current ?? []).map((collection) =>
      collection.id === collectionId
        ? { ...collection, recipeIds: collection.recipeIds.filter((id) => id !== recipeId) }
        : collection
    )
  );
}
