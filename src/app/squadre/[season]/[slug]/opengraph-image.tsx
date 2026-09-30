import { ImageResponse } from "next/og";
import { loadInterFonts } from "@/lib/og/fonts";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/slugUtils";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { BRAND, HERO_TEXT } from "@/lib/palette";
import { teamColor } from "@/lib/teamColors";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = { params: Promise<{ season: string; slug: string }> };

function parseSeasonParam(s: string): string {
  if (s.length === 6) return `${s.slice(0, 4)}-${s.slice(4)}`;
  return s;
}

export default async function OgImage({ params }: Props) {
  const { season: seasonParam, slug } = await params;
  const fonts = await loadInterFonts([FONT_WEIGHT.regular, FONT_WEIGHT.bold]);
  const season = parseSeasonParam(seasonParam);

  const teams = await prisma.competitiveTeam.findMany({
    where: { season, isMixed: false },
    select: { name: true, color: true, championship: true, memberships: { select: { id: true } } },
  });
  const team = teams.find((t) => slugify(t.name) === slug);

  // Senza tinta squadra nessun segno di colore (mai l'arancio come ripiego).
  const tint = teamColor(team?.color);
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
        background: tint
          ? `linear-gradient(150deg, ${BRAND.dark} 0%, ${BRAND.dark} 40%, ${tint} 140%)`
          : BRAND.dark,
        color: HERO_TEXT.primary,
        fontFamily: "Inter, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Cerchi decorativi nella tinta della squadra */}
      {tint && (
        <div
          style={{
            position: "absolute",
            top: -100,
            right: -100,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: `${tint}22`,
            display: "flex",
          }}
        />
      )}
      {tint && (
        <div
          style={{
            position: "absolute",
            bottom: -120,
            left: -120,
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: `${tint}11`,
            display: "flex",
          }}
        />
      )}

      {/* Badge stagione */}
      <div
        style={{
          // Riempimento nella tinta, oppure contorno neutro senza tinta.
          background: tint ?? "transparent",
          color: HERO_TEXT.primary,
          border: `2px solid ${tint ?? HERO_TEXT.lineStrong}`,
          fontSize: 26,
          fontWeight: FONT_WEIGHT.bold,
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
          fontWeight: FONT_WEIGHT.bold,
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
              color: HERO_TEXT.secondary,
              fontWeight: FONT_WEIGHT.bold,
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
              color: HERO_TEXT.muted,
              fontWeight: FONT_WEIGHT.bold,
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
          color: HERO_TEXT.muted,
          fontWeight: FONT_WEIGHT.bold,
          display: "flex",
        }}
      >
        Karibu Baskin · Montecchio Maggiore
      </div>
    </div>,
    { ...size, fonts }
  );
}
