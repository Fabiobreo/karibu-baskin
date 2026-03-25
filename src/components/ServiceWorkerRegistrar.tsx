"use client";
import { useEffect } from "react";

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // registrazione fallita silenziosamente (es. in dev su HTTP)
      });
    }
  }, []);

  return null;
}
