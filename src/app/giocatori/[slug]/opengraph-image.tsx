import { ImageResponse } from "next/og";
import { loadInterFonts } from "@/lib/og/fonts";
import { prisma } from "@/lib/db";
import { isMinor } from "@/lib/minors";
import { userHasPublicProfile } from "@/lib/publicProfile";
import { sportRoleLabel } from "@/lib/constants";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { BRAND, HERO_TEXT, ROLE_FILL } from "@/lib/palette";
import { teamColor } from "@/lib/teamColors";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = { params: Promise<{ slug: string }> };

export default async function OgImage({ params }: Props) {
  const { slug } = await params;
  const fonts = await loadInterFonts([FONT_WEIGHT.regular, FONT_WEIGHT.bold]);

  const rawUser = await prisma.user.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    select: {
      name: true,
      appRole: true,
      sportRole: true,
      sportRoleVariant: true,
      birthDate: true,
      matchStats: { select: { points: true } },
      teamMemberships: {
        take: 1,
        orderBy: { createdAt: "desc" },
        include: { team: { select: { name: true, color: true } } },
      },
    },
  });

  // Le anteprime social le scaricano crawler anonimi: per un minore la card
  // resta generica, senza nome, squadra né statistiche. Lo stesso per chi non
  // ha un profilo pubblico (GUEST, genitore che non gioca).
  const user =
    rawUser &&
    !isMinor(rawUser.birthDate) &&
    userHasPublicProfile({ ...rawUser, matchesPlayed: rawUser.matchStats.length })
      ? rawUser
      : null;

  // Tinta della squadra (UX-29): senza tinta nessun segno di colore, mai
  // l'arancio come ripiego. La tinta non colora mai il testo.
  const tint = teamColor(user?.teamMemberships[0]?.team.color);
  const totalPoints = user?.matchStats.reduce((s, m) => s + m.points, 0) ?? 0;
  const matchesPlayed = user?.matchStats.length ?? 0;
  const roleLabel = user?.sportRole
    ? sportRoleLabel(user.sportRole, user.sportRoleVariant ?? null)
    : null;
  const initial = (user?.name ?? "?")[0].toUpperCase();

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        background: tint
          ? `linear-gradient(150deg, ${BRAND.dark} 0%, ${BRAND.dark} 30%, ${tint} 130%)`
          : BRAND.dark,
        color: HERO_TEXT.primary,
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
          fontWeight: FONT_WEIGHT.bold,
          color: HERO_TEXT.primary,
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
          background: tint ?? BRAND.darkSoft,
          border: `6px solid ${tint ?? HERO_TEXT.lineStrong}`,
          boxShadow: tint ? `0 8px 40px ${tint}88` : "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 84,
          fontWeight: FONT_WEIGHT.bold,
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
            fontWeight: FONT_WEIGHT.bold,
            color: HERO_TEXT.secondary,
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
            fontWeight: FONT_WEIGHT.bold,
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
                // Badge del ruolo Baskin: grafite per tutti i ruoli, il numero
                // è l'informazione (UX-29).
                background: ROLE_FILL,
                color: HERO_TEXT.primary,
                border: `2px solid ${HERO_TEXT.lineStrong}`,
                fontSize: 22,
                fontWeight: FONT_WEIGHT.bold,
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
                // Squadra: riempimento nella tinta, oppure contorno neutro.
                background: tint ?? "transparent",
                color: HERO_TEXT.primary,
                border: `2px solid ${tint ?? HERO_TEXT.lineStrong}`,
                fontSize: 22,
                fontWeight: FONT_WEIGHT.bold,
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
              <span
                style={{
                  fontSize: 64,
                  fontWeight: FONT_WEIGHT.bold,
                  lineHeight: 1,
                  display: "flex",
                }}
              >
                {totalPoints}
              </span>
              <span
                style={{
                  fontSize: 20,
                  color: HERO_TEXT.muted,
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
                  fontWeight: FONT_WEIGHT.bold,
                  lineHeight: 1,
                  display: "flex",
                }}
              >
                {matchesPlayed}
              </span>
              <span
                style={{
                  fontSize: 20,
                  color: HERO_TEXT.muted,
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
