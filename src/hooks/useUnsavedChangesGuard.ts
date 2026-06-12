"use client";
import { useEffect } from "react";

/**
 * Mostra il prompt nativo del browser (refresh/chiusura tab) quando ci sono
 * modifiche non salvate. Non copre la navigazione client-side: per quella
 * usare una conferma esplicita sul bottone di uscita (es. useConfirmDialog).
 */
export function useUnsavedChangesGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    function handler(e: BeforeUnloadEvent) {
      e.preventDefault();
      // Richiesto dai browser Chromium per mostrare il prompt
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
}
