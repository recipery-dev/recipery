import { Zip, ZipPassThrough } from "fflate";
import { readJson } from "@/lib/store";
import type { StorageDriver } from "@/lib/storage/types";
import { listProfiles } from "@/lib/profiles/store";
import { toPublicProfile } from "@/lib/profiles/types";
import { getSettings } from "@/lib/settings/store";
import { getProfileState } from "@/lib/profiles/state";
import type { RecipeRecord } from "@/lib/recipes/types";
import type { Collection } from "@/lib/collections";

function addJsonEntry(zip: Zip, filename: string, data: unknown): void {
  const file = new ZipPassThrough(filename);
  zip.add(file);
  file.push(Buffer.from(JSON.stringify(data, null, 2), "utf-8"), true);
}

/** Streams a bucket file straight into a zip entry, one chunk at a time — never buffers a whole file in memory. */
async function addFileEntry(zip: Zip, storage: StorageDriver, key: string): Promise<void> {
  if (!(await storage.exists(key))) return;
  const stream = await storage.get(key);
  const file = new ZipPassThrough(key);
  zip.add(file);
  for await (const chunk of stream) {
    file.push(chunk as Uint8Array, false);
  }
  file.push(new Uint8Array(0), true);
}

/**
 * Writes every recipe (metadata + photos), collection, profile (passwords
 * stripped), per-profile cooking state, and the shared settings into `zip`,
 * mirroring the live bucket's key layout. Caller is responsible for calling
 * `zip.end()` once this resolves. Shopping lists are deliberately excluded
 * — they're ephemeral, not part of "the library."
 */
export async function writeExportEntries(zip: Zip, storage: StorageDriver): Promise<void> {
  const [recipes, profiles, settings] = await Promise.all([
    readJson<RecipeRecord[]>("index.json"),
    listProfiles(),
    getSettings(),
  ]);

  addJsonEntry(zip, "recipes.json", recipes ?? []);
  addJsonEntry(zip, "profiles.json", profiles.map(toPublicProfile));
  addJsonEntry(zip, "settings.json", settings);

  for (const profile of profiles) {
    const collections = await readJson<Collection[]>(`collections/${profile.id}.json`);
    if (collections) addJsonEntry(zip, `collections/${profile.id}.json`, collections);

    const state = await getProfileState(profile.id);
    addJsonEntry(zip, `profiles/${profile.id}/state.json`, state);
  }

  for (const recipe of recipes ?? []) {
    await addFileEntry(zip, storage, `recipes/${recipe.id}/metadata.json`);
    if (recipe.hasImage && recipe.coverExt) {
      await addFileEntry(zip, storage, `recipes/${recipe.id}/image.${recipe.coverExt}`);
    }
    for (const step of recipe.steps) {
      if (step.hasImage && step.imageExt) {
        await addFileEntry(zip, storage, `recipes/${recipe.id}/steps/${step.id}.${step.imageExt}`);
      }
    }
  }
}
