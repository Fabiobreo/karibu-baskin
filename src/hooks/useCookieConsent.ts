"use client";
import { useState, useEffect, useCallback } from "react";

export type ConsentChoice = {
  maps: boolean;
};

const STORAGE_KEY = "kb-cookie-consent";
const VERSION = 1;

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

export function useCookieConsent() {
  const [decided, setDecided] = useState(false);
  const [consent, setConsent] = useState<ConsentChoice>({ maps: false });

  useEffect(() => {
    const stored = readStored();
    if (stored) {
      setDecided(true);
      setConsent({ maps: stored.maps });
    }
  }, []);

  const accept = useCallback(() => {
    const value: Stored = { maps: true, v: VERSION };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    setConsent({ maps: true });
    setDecided(true);
  }, []);

  const reject = useCallback(() => {
    const value: Stored = { maps: false, v: VERSION };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    setConsent({ maps: false });
    setDecided(true);
  }, []);

  return { decided, consent, accept, reject };
}
