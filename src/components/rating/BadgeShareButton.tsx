"use client";

import { useEffect, useRef, useState } from "react";
import { Button, CircularProgress } from "@mui/material";
import ShareIcon from "@mui/icons-material/Share";
import { useTranslations } from "next-intl";
import { useToast } from "@/context/ToastContext";
import { useShareOutcomeToast } from "@/hooks/useShareOutcomeToast";
import { shareElementAsImage, shareFileName } from "@/lib/shareImage";
import { shareUrl } from "@/lib/shareLinks";
import { TOUCH_TARGET_ON_PHONE } from "@/lib/touchTarget";
import type { BadgeShareSubject } from "@/lib/rating/badgeShare";
import BadgeShareCard, { type BadgeShareCardData } from "@/components/rating/BadgeShareCard";

interface BadgeShareButtonProps {
  badge: { id: string; emoji: string; label: string; tier: BadgeShareCardData["tier"] };
  subject: BadgeShareSubject;
  date: string | null;
  /** Id dell'elemento del traguardo: se è l'ancora dell'indirizzo, ci si porta lì. */
  anchorId: string;
}

/**
 * "Condividi" su un traguardo sbloccato (UX-59), solo nel proprio profilo e in
 * quello dei figli. L'immagine si disegna nel browser e non passa da nessun
 * server; parte con una frase e il link (profilo pubblico, o la home per un
 * minore), con `utm_campaign=traguardo`.
 */
export default function BadgeShareButton({
  badge,
  subject,
  date,
  anchorId,
}: BadgeShareButtonProps) {
  const t = useTranslations("badgeShare");
  const { showToast } = useToast();
  const toastOutcome = useShareOutcomeToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [sharing, setSharing] = useState(false);

  // Dall'avviso "Nuovo traguardo" (`/profilo#traguardo-…`): i traguardi
  // arrivano dopo lo streaming, quando il browser ha già cercato l'ancora.
  useEffect(() => {
    if (window.location.hash !== `#${anchorId}`) return;
    document.getElementById(anchorId)?.scrollIntoView({ block: "center" });
    buttonRef.current?.focus({ preventScroll: true });
  }, [anchorId]);

  async function handleShare() {
    if (!cardRef.current || sharing) return;
    setSharing(true);
    try {
      const outcome = await shareElementAsImage(cardRef.current, {
        title: t("subject", { badge: badge.label }),
        fileName: shareFileName("traguardo", `${subject.firstName}-${badge.label}`),
        link: {
          url: shareUrl(subject.path, "traguardo"),
          text: subject.self
            ? t("msgSelf", { badge: badge.label, emoji: badge.emoji })
            : t("msgOther", { name: subject.firstName, badge: badge.label, emoji: badge.emoji }),
        },
      });
      toastOutcome(outcome);
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("[share badge]", err);
        showToast({ message: t("error"), severity: "error" });
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    <>
      <BadgeShareCard
        ref={cardRef}
        data={{
          emoji: badge.emoji,
          label: badge.label,
          tier: badge.tier,
          firstName: subject.firstName,
          date,
          path: subject.path,
        }}
      />
      <Button
        ref={buttonRef}
        size="small"
        onClick={handleShare}
        disabled={sharing}
        startIcon={sharing ? <CircularProgress size={14} /> : <ShareIcon />}
        aria-label={t("ariaLabel", { badge: badge.label })}
        sx={{ flexShrink: 0, ...TOUCH_TARGET_ON_PHONE }}
      >
        {sharing ? t("sharing") : t("share")}
      </Button>
    </>
  );
}
