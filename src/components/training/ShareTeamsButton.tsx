"use client";
import { forwardRef, useRef, useState } from "react";
import { Button, CircularProgress } from "@mui/material";
import ShareIcon from "@mui/icons-material/Share";
import { format } from "date-fns";
import type { Locale } from "date-fns";
import { useTranslations } from "next-intl";
import { useActiveDateLocale } from "@/hooks/useActiveDateLocale";
import { useEntityLabels } from "@/hooks/useEntityLabels";
import { SITE_HOST } from "@/lib/siteUrl";
import type { TeamsData } from "./TeamDisplay";
import { ROLES, TEAM_META } from "@/lib/constants";
import { BRAND, HERO_TEXT, NEUTRAL, ROLE_COLORS } from "@/lib/palette";
import { TOUCH_TARGET_ON_PHONE } from "@/lib/touchTarget";
import { FONT_WEIGHT } from "@/lib/fontWeight";

interface Props {
  teams: TeamsData;
  coaches?: { id: string; name: string }[];
  sessionTitle: string;
  sessionDate?: string | Date;
  sessionEndTime?: string | Date | null;
}

function formatDateLine(
  date: string | Date,
  dateLocale: Locale,
  endTime?: string | Date | null
): string {
  const d = new Date(date);
  const datePart = format(d, "EEEE d MMMM yyyy", { locale: dateLocale });
  const startTime = format(d, "HH:mm");
  if (endTime) {
    const endPart = format(new Date(endTime), "HH:mm");
    return `${datePart} · ${startTime} – ${endPart}`;
  }
  return `${datePart} · ${startTime}`;
}

// html2canvas non legge il tema: i colori vengono da `@/lib/palette`. Le
// casacche (`TEAM_META[].color`, cioè `BIB`) sono l'unico colore delle squadre
// e stanno sempre accanto al nome (Arancioni/Neri/Bianchi); il resto è neutro.
const INK = NEUTRAL.light;

/**
 * Crea l'immagine delle squadre dalla sorgente nascosta e la condivide (o la
 * scarica dove il browser non condivide file). `AbortError` = l'utente ha chiuso
 * il foglio di condivisione: non è un errore.
 */
async function shareTeamsImage(source: HTMLElement, title: string, sessionTitle: string) {
  const html2canvas = (await import("html2canvas")).default;
  const canvas = await html2canvas(source, {
    scale: 2,
    backgroundColor: INK.paper,
    logging: false,
    useCORS: false,
  });
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/png")
  );
  const file = new File([blob], "squadre.png", { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title });
  } else {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `squadre-${sessionTitle.replace(/\s+/g, "-").toLowerCase()}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

/**
 * "Condividi" con l'etichetta (UX-47): l'azione più frequente sulle squadre,
 * per tutti. L'immagine la disegna `TeamsShareCard`, fuori schermo.
 */
export default function ShareTeamsButton(props: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const tShare = useTranslations("share");

  async function handleShare() {
    if (!cardRef.current || loading) return;
    setLoading(true);
    try {
      await shareTeamsImage(
        cardRef.current,
        tShare("teamsSubject", { title: props.sessionTitle }),
        props.sessionTitle
      );
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("[share teams]", err);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <TeamsShareCard ref={cardRef} {...props} />
      <Button
        variant="outlined"
        size="small"
        onClick={handleShare}
        disabled={loading}
        aria-busy={loading || undefined}
        startIcon={loading ? <CircularProgress size={14} /> : <ShareIcon />}
        sx={{ whiteSpace: "nowrap", ...TOUCH_TARGET_ON_PHONE }}
      >
        {loading ? tShare("teamsGenerating") : tShare("share")}
      </Button>
    </>
  );
}

/**
 * Sorgente dell'immagine da condividere: fuori schermo e nascosta ai lettori di
 * schermo, che altrimenti leggerebbero due volte le squadre. Solo stili inline:
 * html2canvas non legge il tema.
 */
const TeamsShareCard = forwardRef<HTMLDivElement, Props>(function TeamsShareCard(
  { teams, coaches, sessionTitle, sessionDate, sessionEndTime },
  cardRef
) {
  const t = useTranslations("trainings");
  const dateLocale = useActiveDateLocale();
  const { roleLabel, teamColorLabel } = useEntityLabels();

  const teamKeys = (teams.numTeams === 3 ? ["teamA", "teamB", "teamC"] : ["teamA", "teamB"]) as (
    | "teamA"
    | "teamB"
    | "teamC"
  )[];
  const meta = TEAM_META.slice(0, teams.numTeams);

  // Per 3 squadre la card è più stretta (portrait), per 2 affiancate (landscape)
  const CARD_W = teams.numTeams === 3 ? 520 : 640;

  return (
    <div
      aria-hidden="true"
      style={{ position: "fixed", left: -9999, top: 0, pointerEvents: "none", zIndex: -1 }}
    >
      <div
        ref={cardRef}
        style={{
          width: CARD_W,
          background: INK.paper,
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
          overflow: "hidden",
        }}
      >
        {/* ── Header ── */}
        {/* Testata del marchio, come gli hero: nero con il logotipo arancio. */}
        <div style={{ background: BRAND.dark, padding: "18px 22px 16px" }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: FONT_WEIGHT.bold,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: BRAND.orangeOnDark,
              marginBottom: 6,
            }}
          >
            Karibu Baskin
          </div>
          <div
            style={{
              fontSize: teams.numTeams === 3 ? 17 : 20,
              fontWeight: FONT_WEIGHT.bold,
              color: HERO_TEXT.primary,
              lineHeight: 1.2,
            }}
          >
            {sessionTitle}
          </div>
          {sessionDate && (
            <div
              style={{
                fontSize: 11,
                fontWeight: FONT_WEIGHT.regular,
                color: HERO_TEXT.secondary,
                marginTop: 5,
                textTransform: "capitalize",
              }}
            >
              {formatDateLine(sessionDate, dateLocale, sessionEndTime)}
            </div>
          )}
        </div>

        {/* ── Squadre affiancate ── */}
        <div style={{ display: "flex", background: INK.paper }}>
          {teamKeys.map((key, i) => {
            const teamList = (key === "teamC" ? teams.teamC : teams[key]) ?? [];
            const m = meta[i];
            const roleGroups = ROLES.map((role) => ({
              role,
              players: teamList.filter((a) => a.role === role),
            })).filter((g) => g.players.length > 0);
            const isLast = i === teamKeys.length - 1;

            return (
              <div
                key={key}
                style={{
                  flex: 1,
                  borderRight: isLast ? "none" : `2px solid ${INK.divider}`,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Team header */}
                <div
                  style={{
                    background: INK.background,
                    padding: "10px 14px 9px",
                    borderBottom: `3px solid ${m.color}`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: m.color,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontWeight: FONT_WEIGHT.bold,
                        fontSize: 13,
                        color: INK.text,
                        letterSpacing: 0.3,
                      }}
                    >
                      {teamColorLabel(m.key).toUpperCase()}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: INK.textSecondary,
                      marginTop: 2,
                      paddingLeft: 17,
                    }}
                  >
                    {t("athletes", { count: teamList.length })}
                  </div>
                </div>

                {/* Giocatori per ruolo */}
                <div style={{ padding: "10px 14px 14px", flex: 1 }}>
                  {roleGroups.map(({ role, players }, gi) => (
                    <div key={role} style={{ marginTop: gi > 0 ? 10 : 0 }}>
                      {/* Role label */}
                      <div
                        style={{
                          display: "inline-block",
                          fontSize: 9,
                          fontWeight: FONT_WEIGHT.bold,
                          letterSpacing: 1,
                          textTransform: "uppercase",
                          // Ruolo Baskin nel suo colore, testo bianco (UX-29).
                          color: BRAND.white,
                          background: ROLE_COLORS[role as keyof typeof ROLE_COLORS],
                          borderRadius: 3,
                          padding: "2px 5px",
                          marginBottom: 5,
                        }}
                      >
                        {roleLabel(role)}
                      </div>
                      {/* Nomi */}
                      {players.map((p) => (
                        <div
                          key={p.id}
                          style={{
                            fontSize: teams.numTeams === 3 ? 12 : 13,
                            color: INK.text,
                            fontWeight: FONT_WEIGHT.regular,
                            lineHeight: 1.55,
                            paddingLeft: 2,
                          }}
                        >
                          {p.name}
                        </div>
                      ))}
                    </div>
                  ))}
                  {roleGroups.length === 0 && (
                    <div style={{ fontSize: 11, color: INK.textSecondary, fontStyle: "italic" }}>
                      {t("noAthletesEmpty")}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Allenatori ── */}
        {coaches && coaches.length > 0 && (
          <div
            style={{
              padding: "9px 14px",
              background: INK.background,
              borderTop: `2px solid ${INK.divider}`,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "0 10px",
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: FONT_WEIGHT.bold,
                color: INK.textSecondary,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              {t("coachesLabel")}
            </span>
            {coaches.map((c) => (
              <span
                key={c.id}
                style={{ fontSize: 12, fontWeight: FONT_WEIGHT.semibold, color: INK.inkSoft }}
              >
                {c.name}
              </span>
            ))}
          </div>
        )}

        {/* ── Footer branding ── */}
        <div
          style={{
            background: BRAND.dark,
            padding: "7px 14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: 9,
              letterSpacing: 0.8,
              color: HERO_TEXT.muted,
              textTransform: "uppercase",
            }}
          >
            {SITE_HOST}
          </span>
          <div style={{ display: "flex", gap: 3 }}>
            {meta.map((m) => (
              <div
                key={m.key}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: m.color,
                  opacity: 0.7,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});
