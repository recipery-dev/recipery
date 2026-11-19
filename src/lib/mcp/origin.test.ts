import { describe, it, expect } from "vitest";
import { isAllowedOrigin } from "./origin";

function req(headers: Record<string, string>) {
  return new Request("http://recipes.tailnet.ts.net:3000/api/mcp", { method: "POST", headers });
}

describe("isAllowedOrigin", () => {
  it("allows requests with no Origin (non-browser MCP clients)", () => {
    expect(isAllowedOrigin(req({ host: "recipes.tailnet.ts.net:3000" }))).toBe(true);
  });

  it("allows an Origin that matches the host", () => {
    expect(
      isAllowedOrigin(req({ host: "recipes.tailnet.ts.net:3000", origin: "http://recipes.tailnet.ts.net:3000" }))
    ).toBe(true);
  });

  it("uses the forwarded host behind a proxy", () => {
    expect(
      isAllowedOrigin(
        req({ host: "localhost:3000", "x-forwarded-host": "recipes.example.com", origin: "https://recipes.example.com" })
      )
    ).toBe(true);
  });

  it("rejects an Origin from another site", () => {
    expect(isAllowedOrigin(req({ host: "recipes.tailnet.ts.net:3000", origin: "https://evil.example" }))).toBe(false);
  });

  it("rejects a malformed Origin", () => {
    expect(isAllowedOrigin(req({ host: "recipes.tailnet.ts.net:3000", origin: "not a url" }))).toBe(false);
  });
});
