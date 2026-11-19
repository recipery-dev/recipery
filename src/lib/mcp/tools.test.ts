import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { LocalDriver } from "@/lib/storage/local";

let currentDriver: LocalDriver;
vi.mock("@/lib/storage", () => ({ getStorage: () => currentDriver }));

const { createMcpServer } = await import("./server");
const { MCP_TOOLS } = await import("./catalog");
import type { Profile } from "@/lib/profiles/types";

const admin: Profile = { id: "default", name: "Admin", color: "bg-blue-500", role: "admin", createdAt: "" };
const reader: Profile = { ...admin, id: "reader", role: "reader" };

let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "recipery-mcp-"));
  currentDriver = new LocalDriver(root);
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function connect(profile: Profile = admin) {
  const server = createMcpServer(profile, "0.0.0-test");
  const client = new Client({ name: "test", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  return client;
}

async function call(client: Client, name: string, args: Record<string, unknown> = {}) {
  const res = (await client.callTool({ name, arguments: args })) as {
    isError?: boolean;
    content: { type: string; text: string }[];
  };
  const text = res.content[0].text;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data: any = text;
  try {
    data = JSON.parse(text);
  } catch {
    // an error message, not JSON
  }
  return { isError: !!res.isError, data };
}

describe("tool registration", () => {
  it("exposes exactly the tools in the catalog, with matching read-only hints", async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(MCP_TOOLS.map((t) => t.name).sort());
    for (const tool of tools) {
      const info = MCP_TOOLS.find((t) => t.name === tool.name)!;
      expect(tool.annotations?.readOnlyHint).toBe(info.readOnly);
      expect(tool.description).toBe(info.description);
    }
  });
});

describe("recipes", () => {
  it("creates, reads, searches, updates, and deletes a recipe", async () => {
    const client = await connect();

    const created = await call(client, "create_recipe", {
      title: "Dracula Cake",
      tags: ["dessert"],
      cuisine: "Transylvanian",
      ingredients: [{ name: "Filling", isGroup: true }, { name: "flour", quantity: 2, unit: "cup" }],
      steps: ["Mix", "Bake"],
    });
    expect(created.isError).toBe(false);
    expect(created.data).toMatchObject({ id: "dracula-cake", title: "Dracula Cake" });
    expect(created.data.ingredients[1]).toMatchObject({ name: "flour", quantity: "2", unit: "cup" });
    expect(created.data.steps.map((s: { text: string }) => s.text)).toEqual(["Mix", "Bake"]);

    const found = await call(client, "search_recipes", { query: "flour" });
    expect(found.data).toMatchObject({ total: 1 });
    expect(found.data.results[0].id).toBe("dracula-cake");
    expect((await call(client, "search_recipes", { query: "pizza" })).data.total).toBe(0);
    expect((await call(client, "search_recipes", { cuisine: "transylvanian" })).data.total).toBe(1);

    const updated = await call(client, "update_recipe", {
      id: "dracula-cake",
      description: "Spooky",
      cuisine: null,
      steps: ["Mix", "Bake", "Serve"],
    });
    expect(updated.data).toMatchObject({ description: "Spooky", tags: ["dessert"] });
    expect(updated.data.cuisine).toBeUndefined();
    expect(updated.data.steps).toHaveLength(3);

    expect((await call(client, "get_recipe", { id: "dracula-cake" })).data.title).toBe("Dracula Cake");

    expect((await call(client, "delete_recipe", { id: "dracula-cake" })).data).toEqual({ ok: true });
    expect((await call(client, "search_recipes")).data.total).toBe(0);
  });

  it("reports errors as tool errors the model can read", async () => {
    const client = await connect();
    const missing = await call(client, "get_recipe", { id: "nope" });
    expect(missing).toMatchObject({ isError: true, data: "Recipe not found" });
  });

  it("only lets an admin delete", async () => {
    const adminClient = await connect(admin);
    await call(adminClient, "create_recipe", { title: "Soup" });
    const readerClient = await connect(reader);
    const res = await call(readerClient, "delete_recipe", { id: "soup" });
    expect(res.isError).toBe(true);
    expect(res.data).toMatch(/admin/);
    expect((await call(adminClient, "get_recipe", { id: "soup" })).isError).toBe(false);
  });

  it("sets state per profile and filters on it", async () => {
    const client = await connect();
    await call(client, "create_recipe", { title: "Soup" });
    await call(client, "create_recipe", { title: "Stew" });
    const state = await call(client, "set_recipe_state", { id: "soup", rating: 5, favorite: true });
    expect(state.data).toMatchObject({ rating: 5, favorite: true });
    const favs = await call(client, "search_recipes", { favorite: true });
    expect(favs.data.results.map((r: { id: string }) => r.id)).toEqual(["soup"]);
  });

  it("duplicates a recipe", async () => {
    const client = await connect();
    await call(client, "create_recipe", { title: "Soup" });
    expect((await call(client, "duplicate_recipe", { id: "soup" })).data).toMatchObject({ title: "Soup (Copy)" });
  });
});

describe("collections", () => {
  it("creates a collection and moves a recipe in and out", async () => {
    const client = await connect();
    await call(client, "create_recipe", { title: "Soup" });
    const col = (await call(client, "create_collection", { name: "Winter" })).data;

    const added = await call(client, "add_recipe_to_collection", { collectionId: col.id, recipeId: "soup" });
    expect(added.data.recipeIds).toEqual(["soup"]);

    const listed = await call(client, "list_collections");
    expect(listed.data.collections.find((c: { id: string }) => c.id === col.id).recipeIds).toEqual(["soup"]);

    const removed = await call(client, "remove_recipe_from_collection", { collectionId: col.id, recipeId: "soup" });
    expect(removed.data.recipeIds).toEqual([]);

    expect((await call(client, "update_collection", { id: col.id, name: "Cold days" })).data.name).toBe("Cold days");
    expect((await call(client, "delete_collection", { id: col.id })).data).toEqual({ ok: true });
  });

  it("refuses unknown collections and recipes", async () => {
    const client = await connect();
    expect((await call(client, "add_recipe_to_collection", { collectionId: "x", recipeId: "y" })).isError).toBe(true);
    const col = (await call(client, "create_collection", { name: "A" })).data;
    const res = await call(client, "add_recipe_to_collection", { collectionId: col.id, recipeId: "ghost" });
    expect(res).toMatchObject({ isError: true, data: "Recipe not found" });
  });
});

describe("shopping list", () => {
  it("combines ingredients from added recipes and tracks checked items", async () => {
    const client = await connect();
    await call(client, "create_recipe", {
      title: "Pancakes",
      ingredients: [{ name: "Eggs", quantity: "1" }, { name: "Milk", quantity: "1", unit: "cup" }],
    });
    await call(client, "create_recipe", { title: "Bread", ingredients: [{ name: "eggs", quantity: "2" }] });

    await call(client, "add_recipe_to_shopping_list", { recipeId: "pancakes" });
    const list = (await call(client, "add_recipe_to_shopping_list", { recipeId: "bread" })).data;
    expect(list.recipes.map((r: { id: string }) => r.id)).toEqual(["pancakes", "bread"]);
    const eggs = list.items.find((i: { key: string }) => i.key === "eggs");
    expect(eggs.amounts).toEqual(["3"]);
    expect(eggs.fromRecipes).toEqual(["Pancakes", "Bread"]);
    expect(eggs.checked).toBe(false);

    const checked = (await call(client, "set_shopping_items_checked", { checkedOff: ["eggs"] })).data;
    expect(checked.items.find((i: { key: string }) => i.key === "eggs").checked).toBe(true);

    const removed = (await call(client, "remove_recipe_from_shopping_list", { recipeId: "bread" })).data;
    expect(removed.recipes).toHaveLength(1);

    expect((await call(client, "clear_shopping_list")).data).toMatchObject({ recipes: [], items: [] });
  });
});
