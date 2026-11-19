import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Profile } from "@/lib/profiles/types";
import { registerTools } from "./tools";

const INSTRUCTIONS =
  "Recipery is a self-hosted recipe manager. Use these tools to search, read, add, and change recipes, " +
  "organize them into collections, and manage the shopping list. Recipe ids are slugs from search_recipes; " +
  "collection ids are UUIDs from list_collections.";

/** A fresh server per request — the endpoint is stateless, so there is no
 * session to keep between calls. */
export function createMcpServer(profile: Profile, version: string): McpServer {
  const server = new McpServer({ name: "recipery", version }, { instructions: INSTRUCTIONS });
  registerTools(server, profile);
  return server;
}
