"use client";

import { useRef, useState } from "react";
import { Button, CircularProgress, Typography } from "@mui/material";
import ShareIcon from "@mui/icons-material/Share";
import { useTranslations } from "next-intl";
import { useToast } from "@/context/ToastContext";
import { useShareOutcomeToast } from "@/hooks/useShareOutcomeToast";
import { shareElementAsImage, shareFileName } from "@/lib/shareImage";
import { shareUrl } from "@/lib/shareLinks";
import SeasonRecapShareCard, {
  type SeasonRecapShareCardData,
} from "@/components/profile/SeasonRecapShareCard";

interface SeasonRecapShareButtonProps {
  data: SeasonRecapShareCardData;
  /** Il proprio riepilogo (prima persona nel messaggio) o quello di un figlio. */
  self: boolean;
  minor: boolean;
}

/**
 * "Condividi la tua stagione" (UX-60): l'immagine si disegna nel browser e non
 * passa da nessun server; il messaggio porta alla home del club con la
 * campagna `stagione`, mai alla pagina personale, che è privata.
 */
export default function SeasonRecapShareButton({ data, self, minor }: SeasonRecapShareButtonProps) {
  const t = useTranslations("seasonRecap.share");
  const tBadge = useTranslations("badgeShare");
  const { showToast } = useToast();
  const toastOutcome = useShareOutcomeToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);

  async function handleShare() {
    if (!cardRef.current || sharing) return;
    setSharing(true);
    try {
      const outcome = await shareElementAsImage(cardRef.current, {
        title: t("subject", { season: data.season }),
        fileName: shareFileName("stagione", `${data.season}-${data.firstName}`),
        link: {
          url: shareUrl("/", "stagione"),
          text: self
            ? t("msgSelf", { season: data.season })
            : t("msgOther", { season: data.season, name: data.firstName }),
        },
      });
      toastOutcome(outcome);
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("[share stagione]", err);
        showToast({ message: t("error"), severity: "error" });
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    <>
      <SeasonRecapShareCard ref={cardRef} data={data} />
      <Button
        variant="contained"
        size="large"
        onClick={handleShare}
        disabled={sharing}
        startIcon={sharing ? <CircularProgress size={18} color="inherit" /> : <ShareIcon />}
      >
        {sharing ? t("sharing") : t("button")}
      </Button>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
        {minor ? tBadge("minorNote", { name: data.firstName }) : t("hint")}
      </Typography>
    </>
  );
}
