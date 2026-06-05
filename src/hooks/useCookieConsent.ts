"use client";
import { useState, useCallback } from "react";

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
  const [decided, setDecided] = useState(() => readStored() !== null);
  const [consent, setConsent] = useState<ConsentChoice>(() => {
    const stored = readStored();
    return stored ? { maps: stored.maps } : { maps: false };
  });

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
