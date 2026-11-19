"use client";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { DrillContent } from "@/lib/board/content";

/**
 * Bozza non salvata di un disegno sul dispositivo (UX-72, condivisa con le
 * proposte, UX-73). Si scrive a ogni modifica, si toglie al salvataggio, e
 * alla riapertura si propone solo se nasce dalla stessa versione salvata
 * (`base`, di solito `updatedAt`) ed e' diversa da quella.
 */
function useStoredDraft(key: string): string | null {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener("storage", onChange);
      return () => window.removeEventListener("storage", onChange);
    },
    () => {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    () => null
  );
}

export function clearDeviceDraft(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Spazio pieno o navigazione privata: la bozza locale e' solo una comodita'.
  }
}

interface DeviceDraftInput {
  key: string;
  base: string;
  content: DrillContent;
  saved: DrillContent;
  /** Qualcosa e' gia' stato modificato in questa pagina. */
  editedHere: boolean;
}

export function useDeviceDraft({ key, base, content, saved, editedHere }: DeviceDraftInput) {
  const stored = useStoredDraft(key);
  const [dismissed, setDismissed] = useState(false);
  const dirty = content !== saved;

  const draft = useMemo(() => {
    // Solo alla riapertura: mentre si modifica la bozza e' quella che si sta scrivendo.
    if (!stored || dismissed || editedHere) return null;
    try {
      const parsed = JSON.parse(stored) as { base: string; content: DrillContent };
      return parsed.base === base && JSON.stringify(parsed.content) !== JSON.stringify(saved)
        ? parsed.content
        : null;
    } catch {
      return null;
    }
  }, [stored, dismissed, editedHere, base, saved]);

  useEffect(() => {
    if (!dirty) return;
    try {
      window.localStorage.setItem(key, JSON.stringify({ base, content }));
    } catch {
      // vedi sopra
    }
  }, [content, dirty, key, base]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  return {
    draft,
    /** Bozza ripresa: non la si propone piu'. */
    restored: () => setDismissed(true),
    discard: () => {
      clearDeviceDraft(key);
      setDismissed(true);
    },
  };
}
