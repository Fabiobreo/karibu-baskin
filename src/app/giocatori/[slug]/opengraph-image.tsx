import { ImageResponse } from "next/og";
import { loadInterFonts } from "@/lib/og/fonts";
import { prisma } from "@/lib/db";
import { sportRoleLabel } from "@/lib/constants";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = { params: Promise<{ slug: string }> };

const ROLE_COLORS: Record<number, string> = {
  1: "#1565C0",
  2: "#2E7D32",
  3: "#E65100",
  4: "#6A1B9A",
  5: "#C62828",
};

export default async function OgImage({ params }: Props) {
  const { slug } = await params;
  const fonts = await loadInterFonts([400, 700, 800]);

  const user = await prisma.user.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    select: {
      name: true,
      sportRole: true,
      sportRoleVariant: true,
      matchStats: { select: { points: true } },
      teamMemberships: {
        take: 1,
        orderBy: { createdAt: "desc" },
        include: { team: { select: { name: true, color: true } } },
      },
    },
  });

  const playerColor = user?.teamMemberships[0]?.team.color ?? "#E65100";
  const totalPoints = user?.matchStats.reduce((s, m) => s + m.points, 0) ?? 0;
  const matchesPlayed = user?.matchStats.length ?? 0;
  const roleLabel = user?.sportRole
    ? sportRoleLabel(user.sportRole, user.sportRoleVariant ?? null)
    : null;
  const roleColor = user?.sportRole ? (ROLE_COLORS[user.sportRole] ?? "#E65100") : "#E65100";
  const initial = (user?.name ?? "?")[0].toUpperCase();

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        background: `linear-gradient(150deg, #1A1A1A 0%, #1A1A1A 30%, ${playerColor} 130%)`,
        color: "#fff",
        fontFamily: "Inter, sans-serif",
        position: "relative",
        overflow: "hidden",
        padding: "0 80px",
      }}
    >
      {/* Iniziale gigante in filigrana */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          right: -60,
          transform: "translateY(-50%)",
          fontSize: 480,
          fontWeight: 900,
          color: "#fff",
          opacity: 0.04,
          lineHeight: 1,
          display: "flex",
        }}
      >
        {initial}
      </div>

      {/* Avatar placeholder */}
      <div
        style={{
          width: 200,
          height: 200,
          borderRadius: "50%",
          background: playerColor,
          border: `6px solid ${playerColor}`,
          boxShadow: `0 8px 40px ${playerColor}88`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 84,
          fontWeight: 900,
          flexShrink: 0,
          marginRight: 60,
        }}
      >
        {initial}
      </div>

      {/* Info giocatore */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: playerColor,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            marginBottom: 8,
            display: "flex",
          }}
        >
          ★ Karibu Baskin
        </div>
        <div
          style={{
            fontSize: 80,
            fontWeight: 900,
            lineHeight: 1.0,
            marginBottom: 20,
            display: "flex",
          }}
        >
          {user?.name ?? "Giocatore"}
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
          {roleLabel && (
            <div
              style={{
                background: roleColor,
                color: "#fff",
                fontSize: 22,
                fontWeight: 800,
                padding: "8px 20px",
                borderRadius: 24,
                display: "flex",
              }}
            >
              {roleLabel}
            </div>
          )}
          {user?.teamMemberships[0]?.team.name && (
            <div
              style={{
                background: playerColor,
                color: "#fff",
                fontSize: 22,
                fontWeight: 700,
                padding: "8px 20px",
                borderRadius: 24,
                display: "flex",
              }}
            >
              {user.teamMemberships[0].team.name}
            </div>
          )}
        </div>

        {matchesPlayed > 0 && (
          <div style={{ display: "flex", gap: 40 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 64, fontWeight: 900, lineHeight: 1, display: "flex" }}>
                {totalPoints}
              </span>
              <span
                style={{
                  fontSize: 20,
                  color: "rgba(255,255,255,0.6)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  display: "flex",
                }}
              >
                Punti totali
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: 64,
                  fontWeight: 900,
                  lineHeight: 1,
                  color: playerColor,
                  display: "flex",
                }}
              >
                {matchesPlayed}
              </span>
              <span
                style={{
                  fontSize: 20,
                  color: "rgba(255,255,255,0.6)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  display: "flex",
                }}
              >
                {matchesPlayed === 1 ? "Partita" : "Partite"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>,
    { ...size, fonts }
  );
}
