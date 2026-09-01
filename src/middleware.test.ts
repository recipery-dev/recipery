import { describe, it, expect, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

/** DEMO_MODE is read once at module load from NEXT_PUBLIC_DEMO_MODE, so
 * exercising both states needs a fresh module instance per test. */
async function loadMiddleware(demoMode: boolean) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", demoMode ? "true" : "false");
  const mod = await import("./middleware");
  return mod.middleware;
}

function request(method: string, pathname: string): NextRequest {
  return new NextRequest(`http://localhost:3000${pathname}`, { method });
}

function isPassedThrough(response: Response): boolean {
  return response.status === 200 && response.headers.get("x-middleware-next") === "1";
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("middleware — demo mode on", () => {
  it("passes through safe methods (GET/HEAD/OPTIONS)", async () => {
    const middleware = await loadMiddleware(true);
    expect(isPassedThrough(middleware(request("GET", "/api/recipes")))).toBe(true);
    expect(isPassedThrough(middleware(request("HEAD", "/api/recipes")))).toBe(true);
    expect(isPassedThrough(middleware(request("OPTIONS", "/api/recipes")))).toBe(true);
  });

  it("blocks a mutating request with a 403 and an explanatory error", async () => {
    const middleware = await loadMiddleware(true);
    const response = middleware(request("POST", "/api/recipes"));
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toMatch(/read-only demo/i);
  });

  it("blocks DELETE and PATCH too, not just POST", async () => {
    const middleware = await loadMiddleware(true);
    expect(middleware(request("DELETE", "/api/recipes/dracula-cake")).status).toBe(403);
    expect(middleware(request("PATCH", "/api/recipes/dracula-cake")).status).toBe(403);
  });

  it("still allows switching the active profile — it only sets a cookie", async () => {
    const middleware = await loadMiddleware(true);
    expect(isPassedThrough(middleware(request("POST", "/api/profiles/active")))).toBe(true);
  });
});

describe("middleware — demo mode off", () => {
  it("allows mutating requests through", async () => {
    const middleware = await loadMiddleware(false);
    expect(isPassedThrough(middleware(request("POST", "/api/recipes")))).toBe(true);
    expect(isPassedThrough(middleware(request("DELETE", "/api/recipes/dracula-cake")))).toBe(true);
  });
});
