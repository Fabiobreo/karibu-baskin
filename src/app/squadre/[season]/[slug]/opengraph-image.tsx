import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/slugUtils";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = { params: Promise<{ season: string; slug: string }> };

function parseSeasonParam(s: string): string {
  if (s.length === 6) return `${s.slice(0, 4)}-${s.slice(4)}`;
  return s;
}

export default async function OgImage({ params }: Props) {
  const { season: seasonParam, slug } = await params;
  const season = parseSeasonParam(seasonParam);

  const teams = await prisma.competitiveTeam.findMany({
    where: { season },
    select: { name: true, color: true, championship: true, memberships: { select: { id: true } } },
  });
  const team = teams.find((t) => slugify(t.name) === slug);

  const teamColor = team?.color ?? "#E65100";
  const memberCount = team?.memberships.length ?? 0;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(150deg, #1A1A1A 0%, #1A1A1A 40%, ${teamColor} 140%)`,
        color: "#fff",
        fontFamily: "sans-serif",
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

      {/* Badge stagione */}
      <div
        style={{
          background: teamColor,
          color: "#fff",
          fontSize: 26,
          fontWeight: 700,
          padding: "10px 32px",
          borderRadius: 32,
          marginBottom: 32,
          display: "flex",
        }}
      >
        Stagione {season}
      </div>

      {/* Nome squadra */}
      <div
        style={{
          fontSize: 96,
          fontWeight: 900,
          textAlign: "center",
          lineHeight: 1.0,
          marginBottom: 24,
          display: "flex",
          maxWidth: 900,
        }}
      >
        {team?.name ?? "Squadra"}
      </div>

      {/* Campionato e rosa */}
      <div style={{ display: "flex", gap: 32, alignItems: "center", flexWrap: "wrap" }}>
        {team?.championship && (
          <div
            style={{
              fontSize: 28,
              color: "rgba(255,255,255,0.65)",
              fontWeight: 600,
              display: "flex",
            }}
          >
            {team.championship}
          </div>
        )}
        {memberCount > 0 && (
          <div
            style={{
              fontSize: 28,
              color: "rgba(255,255,255,0.5)",
              fontWeight: 600,
              display: "flex",
            }}
          >
            {memberCount} {memberCount === 1 ? "atleta" : "atleti"}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          bottom: 32,
          fontSize: 22,
          color: "rgba(255,255,255,0.3)",
          fontWeight: 600,
          display: "flex",
        }}
      >
        Karibu Baskin · Montecchio Maggiore
      </div>
    </div>,
    { ...size }
  );
}
