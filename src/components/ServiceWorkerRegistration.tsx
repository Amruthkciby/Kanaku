"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Offline shell caching is a nice-to-have -- registration failure isn't fatal.
      });
    }
  }, []);

  return null;
}
