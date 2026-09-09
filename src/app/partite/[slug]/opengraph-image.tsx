import { ImageResponse } from "next/og";
import { loadInterFonts } from "@/lib/og/fonts";
import { prisma } from "@/lib/db";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = { params: Promise<{ slug: string }> };

const RESULT_META = {
  WIN: {
    label: "Vittoria",
    color: "#2E7D32",
    bg: "linear-gradient(150deg,#1A2E1A 0%,#1B3A1B 60%,#1F4A1F 100%)",
  },
  LOSS: {
    label: "Sconfitta",
    color: "#C62828",
    bg: "linear-gradient(150deg,#2E1A1A 0%,#3A1B1B 60%,#4A1F1F 100%)",
  },
  DRAW: {
    label: "Pareggio",
    color: "#E65100",
    bg: "linear-gradient(150deg,#1A1A1A 0%,#2D1A0A 60%,#3D2010 100%)",
  },
};

const DEFAULT_BG = "linear-gradient(150deg,#1A1A1A 0%,#2D1A0A 60%,#3D2010 100%)";

export default async function OgImage({ params }: Props) {
  const { slug } = await params;
  const fonts = await loadInterFonts([400, 700, 800]);

  const match = await prisma.match.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    select: {
      date: true,
      ourScore: true,
      theirScore: true,
      result: true,
      isHome: true,
      matchType: true,
      team: { select: { name: true, color: true } },
      opponent: { select: { name: true } },
      opponentTeam: { select: { name: true } },
    },
  });

  if (!match) {
    return new ImageResponse(
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: DEFAULT_BG,
          color: "#fff",
          fontFamily: "Inter, sans-serif",
          fontSize: 48,
        }}
      >
        Partita non trovata
      </div>,
      { ...size, fonts }
    );
  }

  const opponentName = match.opponent?.name ?? match.opponentTeam?.name ?? "Avversario";
  const hasScore = match.ourScore !== null && match.theirScore !== null;
  const meta = match.result ? RESULT_META[match.result] : null;
  const bg = meta?.bg ?? DEFAULT_BG;
  const teamColor = match.team.color ?? "#E65100";

  const leftTeam = match.isHome ? match.team.name : opponentName;
  const rightTeam = match.isHome ? opponentName : match.team.name;
  const leftScore = match.isHome ? match.ourScore : match.theirScore;
  const rightScore = match.isHome ? match.theirScore : match.ourScore;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: bg,
        color: "#fff",
        fontFamily: "Inter, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Cerchi decorativi */}
      <div
        style={{
          position: "absolute",
          top: -100,
          right: -100,
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: `${teamColor}22`,
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -120,
          left: -120,
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `${teamColor}11`,
          display: "flex",
        }}
      />

      {/* Badge tipo partita */}
      <div
        style={{
          background: teamColor,
          color: "#fff",
          fontSize: 22,
          fontWeight: 700,
          padding: "8px 28px",
          borderRadius: 32,
          marginBottom: 36,
          display: "flex",
        }}
      >
        KARIBU BASKIN
      </div>

      {/* Nomi squadre e punteggio */}
      <div style={{ display: "flex", alignItems: "center", gap: 40, marginBottom: 28 }}>
        <div
          style={{
            fontSize: 56,
            fontWeight: 900,
            textAlign: "right",
            maxWidth: 380,
            lineHeight: 1.1,
            display: "flex",
          }}
        >
          {leftTeam}
        </div>
        <div
          style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 160 }}
        >
          {hasScore ? (
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span style={{ fontSize: 96, fontWeight: 900, lineHeight: 1, display: "flex" }}>
                {leftScore}
              </span>
              <span
                style={{
                  fontSize: 48,
                  color: "rgba(255,255,255,0.4)",
                  fontWeight: 800,
                  display: "flex",
                }}
              >
                –
              </span>
              <span
                style={{
                  fontSize: 96,
                  fontWeight: 900,
                  lineHeight: 1,
                  color: "rgba(255,255,255,0.7)",
                  display: "flex",
                }}
              >
                {rightScore}
              </span>
            </div>
          ) : (
            <span
              style={{
                fontSize: 64,
                color: "rgba(255,255,255,0.3)",
                fontWeight: 800,
                display: "flex",
              }}
            >
              vs
            </span>
          )}
          {meta && (
            <div
              style={{
                marginTop: 12,
                background: meta.color,
                color: "#fff",
                fontSize: 22,
                fontWeight: 800,
                padding: "6px 20px",
                borderRadius: 20,
                display: "flex",
              }}
            >
              {meta.label}
            </div>
          )}
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 900,
            maxWidth: 380,
            lineHeight: 1.1,
            color: "rgba(255,255,255,0.85)",
            display: "flex",
          }}
        >
          {rightTeam}
        </div>
      </div>

      {/* Data */}
      <div
        style={{ fontSize: 26, color: "rgba(255,255,255,0.5)", fontWeight: 600, display: "flex" }}
      >
        {format(new Date(match.date), "EEEE d MMMM yyyy", { locale: it })}
      </div>
    </div>,
    { ...size, fonts }
  );
}
