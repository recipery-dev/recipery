/** @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useIsMobile } from "./use-mobile";

function setWindowWidth(width: number) {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
}

/** jsdom doesn't implement matchMedia — a minimal fake that supports the
 * addEventListener/removeEventListener("change", ...) pair the hook uses,
 * and exposes a way for the test to fire that change manually. */
function stubMatchMedia() {
  const listeners = new Set<() => void>();
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      addEventListener: (_event: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_event: string, listener: () => void) => listeners.delete(listener),
    })
  );
  return { fireChange: () => listeners.forEach((listener) => listener()) };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useIsMobile", () => {
  it("reports false when the viewport is at or above the breakpoint", () => {
    setWindowWidth(1024);
    stubMatchMedia();
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("reports true when the viewport is below the breakpoint", () => {
    setWindowWidth(500);
    stubMatchMedia();
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("updates when the media query listener fires after a resize", () => {
    setWindowWidth(1024);
    const { fireChange } = stubMatchMedia();
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    setWindowWidth(500);
    act(() => fireChange());

    expect(result.current).toBe(true);
  });
});
