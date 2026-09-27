"use client";
import { useState, useCallback, useEffect } from "react";

export type ConsentChoice = {
  maps: boolean;
};

const STORAGE_KEY = "kb-cookie-consent";
const VERSION = 1;
// Il banner e la mappa usano ognuno la propria istanza dell'hook: senza un
// avviso, accettare dal banner non caricava la mappa aperta nella stessa pagina.
const CHANGE_EVENT = "kb-cookie-consent-change";

type Stored = ConsentChoice & { v: number };

function readStored(): Stored | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: Stored = JSON.parse(raw);
    if (parsed.v !== VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStored(maps: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ maps, v: VERSION } satisfies Stored));
  } catch {
    // Storage bloccato: la scelta vale solo per questa pagina.
  }
  window.dispatchEvent(new CustomEvent<ConsentChoice>(CHANGE_EVENT, { detail: { maps } }));
}

export function useCookieConsent() {
  const [decided, setDecided] = useState(() => readStored() !== null);
  const [consent, setConsent] = useState<ConsentChoice>(() => {
    const stored = readStored();
    return stored ? { maps: stored.maps } : { maps: false };
  });

  useEffect(() => {
    function onChange(e: Event) {
      const detail = (e as CustomEvent<ConsentChoice>).detail;
      setConsent({ maps: detail.maps });
      setDecided(true);
    }
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, []);

  const accept = useCallback(() => writeStored(true), []);
  const reject = useCallback(() => writeStored(false), []);

  return { decided, consent, accept, reject };
}
