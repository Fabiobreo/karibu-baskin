"use client";

import { useEffect } from "react";
import {
  REF_COOKIE,
  REF_COOKIE_MAX_AGE_SECONDS,
  encodeReferral,
  referralFromSearch,
} from "@/lib/utm";

/**
 * Al primo arrivo con parametri UTM salva fonte, mezzo e campagna nel cookie
 * tecnico `karibu-ref` (UX-55), che il modulo contatti riporta allo staff. Il
 * primo arrivo vince: un secondo link nei 30 giorni non lo riscrive. Nel
 * browser e non in un middleware, così non costa un'invocazione per pagina.
 */
export default function ReferralCapture() {
  useEffect(() => {
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
