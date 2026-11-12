"use client";

import { forwardRef } from "react";
import { useTranslations } from "next-intl";
import { shortAddress } from "@/lib/shareLinks";
import { BRAND, HERO_TEXT } from "@/lib/palette";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { teamFill } from "@/lib/teamColors";
import type { RecapHighlightKind } from "@/lib/season/seasonRecap";

export interface SeasonRecapShareCardData {
  /** Solo il nome di battesimo. */
  firstName: string;
  season: string;
  /** Tinta salvata della squadra (la prima della stagione), o null: fondo grafite. */
  teamColor: string | null;
  teamName: string | null;
  /** Al massimo tre numeri, dal più alto (`SeasonRecap.highlights`). */
  highlights: { kind: RecapHighlightKind; value: number }[];
}

const FONT = "'Helvetica Neue', Arial, sans-serif";

/**
 * Immagine "La mia stagione" (UX-60): 540 × 960 disegnati a scala 2, cioè
 * 1080 × 1920, il formato delle storie di Instagram e dello stato di WhatsApp.
 * Fondo nella tinta della squadra (con l'etichetta leggibile che le dà
 * `teamFill`), grafite del marchio senza tinta. Solo nome di battesimo e tre
 * numeri, nessun confronto con altri. Fuori schermo e nascosta ai lettori di
 * schermo; colori da `@/lib/palette`, perché html2canvas non legge il tema.
 */
const SeasonRecapShareCard = forwardRef<HTMLDivElement, { data: SeasonRecapShareCardData }>(
  function SeasonRecapShareCard({ data }, ref) {
    const t = useTranslations("seasonRecap.image");
    const fill = teamFill(data.teamColor);
    const bg = fill?.bg ?? BRAND.dark;
    const fg = fill?.fg ?? HERO_TEXT.primary;

    return (
      <div
        aria-hidden="true"
        style={{ position: "fixed", left: -9999, top: 0, pointerEvents: "none", zIndex: -1 }}
      >
        <div
          ref={ref}
          style={{
            width: 540,
            height: 960,
            background: bg,
            color: fg,
            fontFamily: FONT,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Marchio in alto: logo e nome del club. */}
          <div
            style={{
              padding: "36px 40px 0",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- html2canvas legge solo <img> */}
            <img src="/logo.png" alt="" width={56} height={56} style={{ objectFit: "contain" }} />
            <div style={{ fontSize: 24, fontWeight: FONT_WEIGHT.bold }}>Karibu Baskin</div>
          </div>

          <div style={{ padding: "64px 40px 0" }}>
            <div
              style={{
                fontSize: 18,
                fontWeight: FONT_WEIGHT.bold,
                letterSpacing: 3,
                textTransform: "uppercase",
              }}
            >
              {t("kicker", { season: data.season })}
            </div>
            <div
              style={{
                marginTop: 10,
                fontSize: 64,
                fontWeight: FONT_WEIGHT.bold,
                lineHeight: 1.05,
                wordBreak: "break-word",
              }}
            >
              {data.firstName}
            </div>
            {data.teamName && (
              <div style={{ marginTop: 10, fontSize: 22, fontWeight: FONT_WEIGHT.semibold }}>
                {data.teamName}
              </div>
            )}
          </div>

          {/* I numeri, uno per riga. */}
          <div
            style={{
              flex: 1,
              padding: "48px 40px 0",
              display: "flex",
              flexDirection: "column",
              gap: 30,
            }}
          >
            {data.highlights.map((h) => (
              // html2canvas non allinea sulla linea di base: in fondo, con un rientro.
              <div key={h.kind} style={{ display: "flex", alignItems: "flex-end", gap: 18 }}>
                <div style={{ fontSize: 112, fontWeight: FONT_WEIGHT.bold, lineHeight: 1 }}>
                  {h.value}
                </div>
                <div style={{ fontSize: 30, fontWeight: FONT_WEIGHT.semibold, paddingBottom: 10 }}>
                  {t(h.kind, { count: h.value })}
                </div>
              </div>
            ))}
          </div>

          {/* Indirizzo del sito (UX-56): porta alla home, mai alla pagina personale. */}
          <div
            style={{
              background: BRAND.dark,
              color: BRAND.white,
              padding: "22px 40px",
              fontSize: 24,
              fontWeight: FONT_WEIGHT.semibold,
              textAlign: "center",
            }}
          >
            {shortAddress("/")}
          </div>
        </div>
      </div>
    );
  }
);

export default SeasonRecapShareCard;
