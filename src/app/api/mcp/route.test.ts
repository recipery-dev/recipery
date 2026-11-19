import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LocalDriver } from "@/lib/storage/local";

let currentDriver: LocalDriver;
vi.mock("@/lib/storage", () => ({ getStorage: () => currentDriver }));

const route = await import("./route");

let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "recipery-mcp-route-"));
  currentDriver = new LocalDriver(root);
});
afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(root, { recursive: true, force: true });
});

function rpc(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/mcp", {
    method: "POST",
    headers: {
      host: "localhost:3000",
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("/api/mcp", () => {
  it("answers initialize and tools/list over plain JSON, with no auth", async () => {
    const init = await route.POST(
      rpc({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "t", version: "1" } },
      })
    );
    expect(init.status).toBe(200);
    expect((await init.json()).result.serverInfo.name).toBe("recipery");

    const list = await route.POST(rpc({ jsonrpc: "2.0", id: 2, method: "tools/list" }));
    const body = await list.json();
    expect(body.result.tools.length).toBeGreaterThan(10);
  });

  it("runs a tool call end to end", async () => {
    const res = await route.POST(
      rpc({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: "create_recipe", arguments: { title: "Toast" } },
      })
    );
    const body = await res.json();
    expect(JSON.parse(body.result.content[0].text)).toMatchObject({ id: "toast" });
  });

  it("rejects a request from another origin", async () => {
    const res = await route.POST(
      rpc({ jsonrpc: "2.0", id: 1, method: "tools/list" }, { origin: "https://evil.example" })
    );
    expect(res.status).toBe(403);
  });

  it("is POST-only", async () => {
    expect((await route.GET()).status).toBe(405);
    expect((await route.DELETE()).status).toBe(405);
  });

  it("fails clearly when MCP_PROFILE_ID points at nothing", async () => {
    vi.stubEnv("MCP_PROFILE_ID", "ghost");
    await expect(route.POST(rpc({ jsonrpc: "2.0", id: 1, method: "tools/list" }))).rejects.toThrow(/MCP_PROFILE_ID/);
  });
});
