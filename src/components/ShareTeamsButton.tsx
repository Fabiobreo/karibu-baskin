"use client";
import { useRef, useState } from "react";
import { IconButton, Tooltip, CircularProgress } from "@mui/material";
import ShareIcon from "@mui/icons-material/Share";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { TeamsData } from "./TeamDisplay";
import { ROLE_LABELS, ROLE_COLORS, ROLES, TEAM_META } from "@/lib/constants";

interface Props {
  teams: TeamsData;
  coaches?: { id: string; name: string }[];
  sessionTitle: string;
  sessionDate?: string | Date;
  sessionEndTime?: string | Date | null;
}

function formatDateLine(date: string | Date, endTime?: string | Date | null): string {
  const d = new Date(date);
  const datePart = format(d, "EEEE d MMMM yyyy", { locale: it });
  const startTime = format(d, "HH:mm");
  if (endTime) {
    const endPart = format(new Date(endTime), "HH:mm");
    return `${datePart} · ${startTime} – ${endPart}`;
  }
  return `${datePart} · ${startTime}`;
}

// Schiarisce un colore hex mescolandolo con bianco (amount 0–1 = % di bianco)
function tint(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

export default function ShareTeamsButton({ teams, coaches, sessionTitle, sessionDate, sessionEndTime }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  async function handleShare() {
    if (!cardRef.current || loading) return;
    setLoading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
        useCORS: false,
      });
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => b ? resolve(b) : reject(new Error("toBlob")), "image/png")
      );
      const file = new File([blob], "squadre.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Squadre — ${sessionTitle}` });
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

  const teamKeys = (teams.numTeams === 3
    ? ["teamA", "teamB", "teamC"]
    : ["teamA", "teamB"]) as ("teamA" | "teamB" | "teamC")[];
  const meta = TEAM_META.slice(0, teams.numTeams);

  // Per 3 squadre la card è più stretta (portrait), per 2 affiancate (landscape)
  const CARD_W = teams.numTeams === 3 ? 520 : 640;

  return (
    <>
      {/* Card off-screen — catturata da html2canvas con soli inline styles */}
      <div style={{ position: "fixed", left: -9999, top: 0, pointerEvents: "none", zIndex: -1 }}>
        <div ref={cardRef} style={{ width: CARD_W, background: "#ffffff", fontFamily: "'Helvetica Neue', Arial, sans-serif", overflow: "hidden" }}>

          {/* ── Header ── */}
          <div style={{ background: "#E65100", padding: "18px 22px 16px" }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,0.65)", marginBottom: 6 }}>
              Karibu Baskin
            </div>
            <div style={{ fontSize: teams.numTeams === 3 ? 17 : 20, fontWeight: 900, color: "#fff", lineHeight: 1.2 }}>
              {sessionTitle}
            </div>
            {sessionDate && (
              <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.75)", marginTop: 5, textTransform: "capitalize" }}>
                {formatDateLine(sessionDate, sessionEndTime)}
              </div>
            )}
          </div>

          {/* ── Squadre affiancate ── */}
          <div style={{ display: "flex", background: "#fff" }}>
            {teamKeys.map((key, i) => {
              const teamList = (key === "teamC" ? teams.teamC : teams[key]) ?? [];
              const m = meta[i];
              const roleGroups = ROLES
                .map((role) => ({ role, players: teamList.filter((a) => a.role === role) }))
                .filter((g) => g.players.length > 0);
              const isLast = i === teamKeys.length - 1;

              return (
                <div
                  key={key}
                  style={{
                    flex: 1,
                    borderRight: isLast ? "none" : `2px solid #f0f0f0`,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* Team header */}
                  <div style={{ background: tint(m.color, 0.90), padding: "10px 14px 9px", borderBottom: `3px solid ${m.color}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: m.color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 800, fontSize: 13, color: "#111", letterSpacing: 0.3 }}>
                        {m.name.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "#666", marginTop: 2, paddingLeft: 17 }}>
                      {teamList.length} {teamList.length === 1 ? "atleta" : "atleti"}
                    </div>
                  </div>

                  {/* Giocatori per ruolo */}
                  <div style={{ padding: "10px 14px 14px", flex: 1 }}>
                    {roleGroups.map(({ role, players }, gi) => (
                      <div key={role} style={{ marginTop: gi > 0 ? 10 : 0 }}>
                        {/* Role label */}
                        <div style={{
                          display: "inline-block",
                          fontSize: 9, fontWeight: 800, letterSpacing: 1,
                          textTransform: "uppercase",
                          color: "#fff",
                          background: ROLE_COLORS[role],
                          borderRadius: 3,
                          padding: "2px 5px",
                          marginBottom: 5,
                        }}>
                          {ROLE_LABELS[role]}
                        </div>
                        {/* Nomi */}
                        {players.map((p) => (
                          <div key={p.id} style={{
                            fontSize: teams.numTeams === 3 ? 12 : 13,
                            color: "#1a1a1a",
                            fontWeight: 500,
                            lineHeight: 1.55,
                            paddingLeft: 2,
                          }}>
                            {p.name}
                          </div>
                        ))}
                      </div>
                    ))}
                    {roleGroups.length === 0 && (
                      <div style={{ fontSize: 11, color: "#bbb", fontStyle: "italic" }}>Nessun atleta</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Allenatori ── */}
          {coaches && coaches.length > 0 && (
            <div style={{
              padding: "9px 14px",
              background: "#f8f8f8",
              borderTop: "2px solid #f0f0f0",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "0 10px",
            }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: "#999", textTransform: "uppercase", letterSpacing: 1 }}>
                Allenatori
              </span>
              {coaches.map((c) => (
                <span key={c.id} style={{ fontSize: 12, fontWeight: 600, color: "#444" }}>{c.name}</span>
              ))}
            </div>
          )}

          {/* ── Footer branding ── */}
          <div style={{ background: "#111", padding: "7px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 9, letterSpacing: 0.8, color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>
              karibubaskin.vercel.app
            </span>
            <div style={{ display: "flex", gap: 3 }}>
              {meta.map((m) => (
                <div key={m.key} style={{ width: 8, height: 8, borderRadius: "50%", background: m.color, opacity: 0.7 }} />
              ))}
            </div>
          </div>

        </div>
      </div>

      <Tooltip title={loading ? "Generando immagine..." : "Condividi squadre"}>
        <span>
          <IconButton
            size="small"
            onClick={handleShare}
            disabled={loading}
            sx={{ opacity: 0.7, "&:hover": { opacity: 1 } }}
          >
            {loading ? <CircularProgress size={16} /> : <ShareIcon fontSize="small" />}
          </IconButton>
        </span>
      </Tooltip>
    </>
  );
}
