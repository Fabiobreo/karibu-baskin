"use client";

import { useEffect } from "react";
import {
  REF_COOKIE,
  REF_COOKIE_MAX_AGE_SECONDS,
  encodeReferral,
  referralFromSearch,
} from "@/lib/utm";
import { shareVisitFromSearch } from "@/lib/shareLinks";

/**
 * Al primo arrivo con parametri UTM salva fonte, mezzo e campagna nel cookie
 * tecnico `karibu-ref` (UX-55), che il modulo contatti riporta allo staff. Il
 * primo arrivo vince: un secondo link nei 30 giorni non lo riscrive. Nel
 * browser e non in un middleware, così non costa un'invocazione per pagina.
 */
export default function ReferralCapture() {
  useEffect(() => {
    countShareVisit();
    try {
      if (document.cookie.split("; ").some((c) => c.startsWith(`${REF_COOKIE}=`))) return;
      const ref = referralFromSearch(window.location.search);
      if (!ref) return;
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${REF_COOKIE}=${encodeURIComponent(encodeReferral(ref))}; Max-Age=${REF_COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
    } catch {
      // Cookie bloccati: nessuna provenienza, il sito funziona uguale.
    }
  }, []);
  return null;
}

/**
 * Arrivo da un bottone "Condividi" del sito (UX-56): un contatore anonimo per
 * giorno, campagna e fonte (`POST /api/share/visit`). Una volta per scheda e
 * per indirizzo, così ricaricare la pagina non conta due volte.
 */
function countShareVisit() {
  const visit = shareVisitFromSearch(window.location.search);
  if (!visit) return;
  const key = `karibu-share-visit:${window.location.pathname}${window.location.search}`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    // Archiviazione bloccata: si conta lo stesso, al più due volte.
  }
  fetch("/api/share/visit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(visit),
    keepalive: true,
  }).catch(() => {
    // Un contatore perso non è un errore per chi guarda la pagina.
  });
}
