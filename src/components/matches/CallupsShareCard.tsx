"use client";

import { forwardRef } from "react";
import { useTranslations } from "next-intl";
import { useEntityLabels } from "@/hooks/useEntityLabels";
import { SITE_HOST } from "@/lib/siteUrl";
import { BRAND, HERO_TEXT, NEUTRAL, ROLE_COLORS } from "@/lib/palette";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { groupCallupsByRole } from "@/lib/matches/callupGroups";
import type { CallupEntry } from "@/components/matches/matchDetailTypes";

/** Testi della testata, già formattati dal server (fuso di Roma). */
export interface CallupsShareInfo {
  /** "6 Cesti Baskin vs Karibu", con la squadra di casa prima. */
  title: string;
  /** "Domenica 25 ottobre · 09:00". */
  when: string;
  /** Luogo da `matchLocation()`, o "Luogo da confermare". */
  place: string;
}

interface CallupsShareCardProps {
  callups: CallupEntry[];
  info: CallupsShareInfo;
}

// html2canvas non legge il tema: i colori vengono da `@/lib/palette`.
const INK = NEUTRAL.light;

/**
 * Sorgente dell'immagine dei convocati da mandare nei gruppi WhatsApp: fuori
 * schermo e nascosta ai lettori di schermo. Stessa struttura della distinta
 * della pagina (ruoli con il loro badge), solo stili inline.
 */
const CallupsShareCard = forwardRef<HTMLDivElement, CallupsShareCardProps>(
  function CallupsShareCard({ callups, info }, ref) {
    const t = useTranslations("matches");
    const { roleLabel } = useEntityLabels();
    const groups = groupCallupsByRole(callups);

    return (
      <div
        aria-hidden="true"
        style={{ position: "fixed", left: -9999, top: 0, pointerEvents: "none", zIndex: -1 }}
      >
        <div
          ref={ref}
          style={{
            width: 560,
            background: INK.paper,
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
            overflow: "hidden",
          }}
        >
          {/* Testata del marchio: nero con il logotipo arancio. */}
          <div style={{ background: BRAND.dark, padding: "18px 22px 16px" }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: FONT_WEIGHT.bold,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: BRAND.orangeOnDark,
                marginBottom: 6,
              }}
            >
              {`Karibu Baskin · ${t("shareCallupsKicker")}`}
            </div>
            <div
              style={{
                fontSize: 21,
                fontWeight: FONT_WEIGHT.bold,
                color: HERO_TEXT.primary,
                lineHeight: 1.2,
              }}
            >
              {info.title}
            </div>
            <div style={{ fontSize: 13, color: HERO_TEXT.secondary, marginTop: 6 }}>
              {info.when}
            </div>
            <div style={{ fontSize: 13, color: HERO_TEXT.secondary, marginTop: 2 }}>
              {info.place}
            </div>
          </div>

          {/* Convocati per ruolo, in due colonne. */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              padding: "16px 22px 18px",
              rowGap: 16,
            }}
          >
            {groups.map(({ role, list }) => (
              <div key={role ?? "none"} style={{ width: "50%", paddingRight: 12 }}>
                <div
                  style={{
                    display: "inline-block",
                    fontSize: 11,
                    fontWeight: FONT_WEIGHT.bold,
                    letterSpacing: 0.6,
                    textTransform: "uppercase",
                    // Ruolo Baskin nel suo colore, testo bianco (UX-29).
                    color: role ? BRAND.white : INK.textSecondary,
                    background: role
                      ? ROLE_COLORS[role as keyof typeof ROLE_COLORS]
                      : INK.background,
                    borderRadius: 4,
                    padding: "3px 7px",
                    marginBottom: 6,
                  }}
                >
                  {role ? roleLabel(role) : t("unassignedRole", { count: list.length })}
                </div>
                {list.map((c) => (
                  <div
                    key={c.id}
                    style={{ fontSize: 15, color: INK.text, lineHeight: 1.55, paddingLeft: 2 }}
                  >
                    {(c.user ?? c.child)?.name ?? ""}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div
            style={{
              background: BRAND.dark,
              padding: "8px 22px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 10,
                letterSpacing: 0.8,
                color: HERO_TEXT.muted,
                textTransform: "uppercase",
              }}
            >
              {SITE_HOST}
            </span>
            <span style={{ fontSize: 11, color: HERO_TEXT.muted }}>
              {t("shareCallupsCount", { count: callups.length })}
            </span>
          </div>
        </div>
      </div>
    );
  }
);

export default CallupsShareCard;
