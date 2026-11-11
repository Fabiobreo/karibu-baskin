"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/context/ToastContext";
import type { ShareImageOutcome } from "@/lib/shareImage";

/**
 * Avviso dopo la condivisione di un'immagine (UX-56): sul telefono si apre il
 * foglio di condivisione e non serve dire niente; sul computer l'immagine si
 * scarica e il messaggio con il link è negli appunti, da incollare accanto.
 */
export function useShareOutcomeToast() {
  const t = useTranslations("share");
  const { showToast } = useToast();
  return useCallback(
    (outcome: ShareImageOutcome) => {
      if (outcome === "shared") return;
      showToast({
        message: t(outcome === "downloaded" ? "imageDownloadedLinkCopied" : "imageDownloaded"),
        severity: "success",
      });
    },
    [t, showToast]
  );
}
