"use client";
import { useRef, useState } from "react";
import { IconButton, Tooltip, CircularProgress } from "@mui/material";
import ShareIcon from "@mui/icons-material/Share";
import type { TeamsData } from "./TeamDisplay";
import { ROLE_LABELS, ROLE_COLORS, ROLES, TEAM_META } from "@/lib/constants";

interface Props {
  teams: TeamsData;
  coaches?: { id: string; name: string }[];
  sessionTitle: string;
}

export default function ShareTeamsButton({ teams, coaches, sessionTitle }: Props) {
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

  return (
    <>
      {/* Card off-screen, catturata da html2canvas — solo inline styles */}
      <div style={{ position: "fixed", left: -9999, top: 0, pointerEvents: "none", zIndex: -1 }}>
        <div ref={cardRef} style={{
          width: 560,
          background: "#ffffff",
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
          overflow: "hidden",
        }}>
          {/* Header app */}
          <div style={{ background: "#E65100", padding: "14px 20px" }}>
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>
              Karibu Baskin
            </div>
            <div style={{ color: "#fff", fontSize: 18, fontWeight: 800, marginTop: 4 }}>
              {sessionTitle}
            </div>
          </div>

          {/* Squadre impilate */}
          {teamKeys.map((key, i) => {
            const teamList = (key === "teamC" ? teams.teamC : teams[key]) ?? [];
            const m = meta[i];
            const roleGroups = ROLES
              .map((role) => ({ role, players: teamList.filter((a) => a.role === role) }))
              .filter((g) => g.players.length > 0);

            return (
              <div key={key} style={{ borderBottom: i < teamKeys.length - 1 ? "1px solid #e0e0e0" : "none" }}>
                <div style={{
                  background: m.color,
                  padding: "8px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}>
                  <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{m.name}</span>
                  <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 13 }}>
                    {teamList.length} {teamList.length === 1 ? "atleta" : "atleti"}
                  </span>
                </div>
                <div style={{ padding: "10px 20px 14px", background: "#fafafa" }}>
                  {roleGroups.map(({ role, players }) => (
                    <div key={role} style={{ marginBottom: 8 }}>
                      <div style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: 0.8,
                        textTransform: "uppercase", marginBottom: 3,
                        color: ROLE_COLORS[role],
                      }}>
                        {ROLE_LABELS[role]}
                      </div>
                      {players.map((p) => (
                        <div key={p.id} style={{ fontSize: 14, color: "#1a1a1a", padding: "1px 0" }}>
                          {p.name}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Allenatori */}
          {coaches && coaches.length > 0 && (
            <div style={{
              padding: "8px 20px",
              background: "#f5f5f5",
              borderTop: "1px solid #e0e0e0",
              display: "flex",
              flexWrap: "wrap",
              gap: "0 10px",
              alignItems: "center",
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: 0.8 }}>
                Allenatori
              </span>
              {coaches.map((c) => (
                <span key={c.id} style={{ fontSize: 13, color: "#333" }}>{c.name}</span>
              ))}
            </div>
          )}

          {/* Footer */}
          <div style={{ background: "#1a1a1a", padding: "5px 20px" }}>
            <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 10 }}>karibubaskin.vercel.app</span>
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
