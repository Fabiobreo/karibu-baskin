"use client";
import { useRef, useState } from "react";
import { IconButton, Tooltip, CircularProgress } from "@mui/material";
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
import { TOUCH_TARGET_MIN } from "@/lib/touchTarget";
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

export default function ShareTeamsButton({
  teams,
  coaches,
  sessionTitle,
  sessionDate,
  sessionEndTime,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const t = useTranslations("trainings");
  const tShare = useTranslations("share");
  const dateLocale = useActiveDateLocale();
  const { roleLabel, teamColorLabel } = useEntityLabels();

  async function handleShare() {
    if (!cardRef.current || loading) return;
    setLoading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, {
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
        await navigator.share({
          files: [file],
          title: tShare("teamsSubject", { title: sessionTitle }),
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `squadre-${sessionTitle.replace(/\s+/g, "-").toLowerCase()}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("[share teams]", err);
      }
    } finally {
      setLoading(false);
    }
  }

  const teamKeys = (teams.numTeams === 3 ? ["teamA", "teamB", "teamC"] : ["teamA", "teamB"]) as (
    | "teamA"
    | "teamB"
    | "teamC"
  )[];
  const meta = TEAM_META.slice(0, teams.numTeams);

  // Per 3 squadre la card è più stretta (portrait), per 2 affiancate (landscape)
  const CARD_W = teams.numTeams === 3 ? 520 : 640;

  return (
    <>
      {/* Card off-screen — catturata da html2canvas con soli inline styles */}
      {/* Sorgente dell'immagine da condividere: fuori schermo e nascosta ai
          lettori di schermo, che altrimenti leggerebbero due volte le squadre. */}
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

      <Tooltip title={loading ? tShare("teamsGenerating") : tShare("teamsTooltip")}>
        <span>
          <IconButton
            size="small"
            onClick={handleShare}
            disabled={loading}
            aria-label={tShare("teamsTooltip")}
            sx={{ ...TOUCH_TARGET_MIN, opacity: 0.7, "&:hover": { opacity: 1 } }}
          >
            {loading ? <CircularProgress size={16} /> : <ShareIcon fontSize="small" />}
          </IconButton>
        </span>
      </Tooltip>
    </>
  );
}
