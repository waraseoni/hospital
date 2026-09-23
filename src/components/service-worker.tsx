"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      const url = `${window.location.origin}/sw.js`;
      navigator.serviceWorker.register(url, { updateViaCache: "none" }).catch(() => {
        // SW registration is optional — ignore failures
      });
    }
  }, []);

  return null;
}