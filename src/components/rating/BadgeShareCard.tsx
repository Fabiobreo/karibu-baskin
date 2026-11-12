"use client";

import { forwardRef } from "react";
import { useTranslations } from "next-intl";
import { shortAddress } from "@/lib/shareLinks";
import { BRAND, HERO_TEXT, MEDAL, NEUTRAL } from "@/lib/palette";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import type { BadgeTier } from "@/lib/rating/badges";

export interface BadgeShareCardData {
  emoji: string;
  /** Nome del traguardo, già tradotto. */
  label: string;
  tier: BadgeTier;
  /** Solo il nome di battesimo. */
  firstName: string;
  /** "12 novembre 2026", o null se non si sa quando è arrivato. */
  date: string | null;
  /** Pagina del link: l'indirizzo in fondo all'immagine. */
  path: string;
}

// html2canvas non legge il tema: i colori vengono da `@/lib/palette`.
const INK = NEUTRAL.light;
const FONT = "'Helvetica Neue', Arial, sans-serif";

/**
 * Immagine di un traguardo da mandare ai nonni o nel gruppo della classe
 * (UX-59): 540 × 675 disegnati a scala 2, cioè 1080 × 1350, il formato
 * verticale di WhatsApp e Instagram. Fuori schermo e nascosta ai lettori di
 * schermo. Il livello è un metallo con una forma (il disco intorno all'emoji)
 * e la sua parola (UX-29).
 */
const BadgeShareCard = forwardRef<HTMLDivElement, { data: BadgeShareCardData }>(
  function BadgeShareCard({ data }, ref) {
    const t = useTranslations("badgeShare");
    const tTier = useTranslations("badgeProgress");
    const metal = MEDAL.light[data.tier];
    const metalBg = MEDAL.light[`${data.tier}Bg`];

    return (
      <div
        aria-hidden="true"
        style={{ position: "fixed", left: -9999, top: 0, pointerEvents: "none", zIndex: -1 }}
      >
        <div
          ref={ref}
          style={{
            width: 540,
            height: 675,
            background: INK.background,
            fontFamily: FONT,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Testata del marchio. */}
          <div
            style={{
              background: BRAND.dark,
              padding: "18px 28px",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- html2canvas legge solo <img> */}
            <img src="/logo.png" alt="" width={40} height={40} style={{ objectFit: "contain" }} />
            <div>
              <div style={{ fontSize: 18, fontWeight: FONT_WEIGHT.bold, color: HERO_TEXT.primary }}>
                Karibu Baskin
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: FONT_WEIGHT.bold,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: BRAND.orangeOnDark,
                }}
              >
                {t("kicker")}
              </div>
            </div>
          </div>

          {/* Il traguardo. */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 36px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 220,
                height: 220,
                borderRadius: "50%",
                border: `10px solid ${metal}`,
                background: metalBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 112,
                lineHeight: 1,
              }}
            >
              {data.emoji}
            </div>
            <div
              style={{
                marginTop: 14,
                fontSize: 14,
                fontWeight: FONT_WEIGHT.bold,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: metal,
              }}
            >
              {tTier(`tier_${data.tier}`)}
            </div>
            <div style={{ marginTop: 26, fontSize: 20, color: INK.textSecondary }}>
              {t("reached", { name: data.firstName })}
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: 42,
                fontWeight: FONT_WEIGHT.bold,
                color: INK.text,
                lineHeight: 1.15,
              }}
            >
              {data.label}
            </div>
            {data.date && (
              <div style={{ marginTop: 12, fontSize: 18, color: INK.textSecondary }}>
                {data.date}
              </div>
            )}
          </div>

          {/* Indirizzo del sito (UX-56). */}
          <div
            style={{
              background: BRAND.dark,
              padding: "16px 28px",
              fontSize: 20,
              fontWeight: FONT_WEIGHT.semibold,
              color: BRAND.white,
              textAlign: "center",
            }}
          >
            {shortAddress(data.path)}
          </div>
        </div>
      </div>
    );
  }
);

export default BadgeShareCard;
