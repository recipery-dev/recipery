"use client";

import * as React from "react";

/**
 * Registers the offline-support service worker (public/sw.js). Renders
 * nothing — fails silently on browsers without support, so the app works
 * fully either way, just without offline caching on unsupported ones.
 */
export function ServiceWorkerRegister() {
  React.useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // offline support just won't be available — nothing else depends on it
    });
  }, []);

  return null;
}
