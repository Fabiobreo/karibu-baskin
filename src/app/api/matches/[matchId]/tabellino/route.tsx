import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db";
import { it } from "date-fns/locale";
import { publicSubjects } from "@/lib/minors";
import { formatRome } from "@/lib/dateUtils";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { BRAND, HERO, HERO_TEXT, MEDAL, OUTCOME } from "@/lib/palette";
import { teamColor } from "@/lib/teamColors";

// Node runtime (default) — necessario perché usiamo Prisma.
export const dynamic = "force-dynamic";

// L'immagine è fatta per essere condivisa sui social ed è servita con cache CDN
// pubblica, uguale per chiunque la chieda: per questo non contiene mai i nomi
// dei minori, a prescindere da chi la genera (tutela dei minori, @/lib/minors).
const TOP_SCORERS = 5;

const WIDTH = 1080;
const HEIGHT = 1350;

const MATCH_TYPE_LABEL: Record<string, string> = {
  LEAGUE: "Campionato",
  TOURNAMENT: "Torneo",
  FRIENDLY: "Amichevole",
};

// Esiti (UX-29): il chip porta l'etichetta bianca, quindi usa i valori pieni
// del tema chiaro (>= 4,5:1 col bianco, come `heroResultColor`); il fondo
// sfuma nella velatura scura dell'esito. Il pareggio è ambra, mai arancio.
const RESULT_META: Record<
  "WIN" | "LOSS" | "DRAW",
  { label: string; color: string; gradient: string }
> = {
  WIN: {
    label: "VITTORIA",
    color: OUTCOME.light.win,
    gradient: `linear-gradient(150deg, ${BRAND.dark} 0%, ${OUTCOME.dark.winBg} 100%)`,
  },
  LOSS: {
    label: "SCONFITTA",
    color: OUTCOME.light.loss,
    gradient: `linear-gradient(150deg, ${BRAND.dark} 0%, ${OUTCOME.dark.lossBg} 100%)`,
  },
  DRAW: {
    label: "PAREGGIO",
    color: OUTCOME.light.draw,
    gradient: `linear-gradient(150deg, ${BRAND.dark} 0%, ${OUTCOME.dark.drawBg} 100%)`,
  },
};

type Params = { params: Promise<{ matchId: string }> };

// Stella disegnata in SVG: il font di default di Satori non ha il glifo ★ e al
// suo posto l'immagine mostrava un riquadro vuoto.
function Star() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path
        fill={MEDAL.dark.gold}
        d="M12 2l2.9 6.9 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 21.2l1.6-7L2 9.5l7.1-.6z"
      />
    </svg>
  );
}

export async function GET(_req: Request, { params }: Params) {
  const { matchId } = await params;

  const match = await prisma.match.findFirst({
    where: { OR: [{ id: matchId }, { slug: matchId }] },
    include: {
      team: { select: { name: true, color: true } },
      opponent: { select: { name: true } },
      opponentTeam: { select: { name: true } },
      // Niente `take`: i minori si scartano dopo, e il limite vale sugli adulti.
      playerStats: {
        where: { points: { gt: 0 } },
        orderBy: { points: "desc" },
        include: {
          user: { select: { name: true, sportRole: true, birthDate: true } },
          child: { select: { name: true, sportRole: true, birthDate: true } },
        },
      },
      mvps: {
        include: {
          user: { select: { name: true, birthDate: true } },
          child: { select: { name: true, birthDate: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!match) {
    return new Response("Partita non trovata", { status: 404 });
  }

  const opponentName = match.opponent?.name ?? match.opponentTeam?.name ?? "Avversario";
  const hasScore = match.ourScore !== null && match.theirScore !== null;
  const meta = match.result ? RESULT_META[match.result] : null;
  const background = meta?.gradient ?? `linear-gradient(150deg, ${HERO.from} 0%, ${HERO.to} 100%)`;
  // Cerchi decorativi nella tinta della squadra; senza tinta restano neutri
  // (mai l'arancio come ripiego).
  const tint = teamColor(match.team.color);
  const circleStrong = tint ? `${tint}33` : HERO_TEXT.surface;
  const circleSoft = tint ? `${tint}1F` : HERO_TEXT.surface;

  const topScorers = publicSubjects(match.playerStats, false)
    .slice(0, TOP_SCORERS)
    .map((s) => ({
      name: (s.user?.name ?? s.child?.name ?? "—").split(" ")[0],
      lastName: (s.user?.name ?? s.child?.name ?? "").split(" ").slice(1).join(" ") || "",
      points: s.points,
    }));

  const mvps = publicSubjects(match.mvps, false)
    .map((m) => m.user?.name ?? m.child?.name ?? null)
    .filter((n): n is string => !!n);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background,
        color: HERO_TEXT.primary,
        fontFamily: "sans-serif",
        padding: "60px 60px 40px 60px",
        position: "relative",
      }}
    >
      {/* Cerchi decorativi */}
      <div
        style={{
          position: "absolute",
          top: -100,
          right: -100,
          width: 380,
          height: 380,
          borderRadius: "50%",
          background: circleStrong,
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -150,
          left: -150,
          width: 480,
          height: 480,
          borderRadius: "50%",
          background: circleSoft,
          display: "flex",
        }}
      />

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 32,
        }}
      >
        <div
          style={{
            // Il marchio: arancio pieno che regge l'etichetta bianca (4,71:1).
            background: BRAND.orangeFill,
            color: HERO_TEXT.primary,
            fontSize: 22,
            fontWeight: FONT_WEIGHT.bold,
            padding: "8px 22px",
            borderRadius: 24,
            letterSpacing: 2,
            display: "flex",
          }}
        >
          KARIBU BASKIN
        </div>
        <div
          style={{
            fontSize: 22,
            color: HERO_TEXT.muted,
            fontWeight: FONT_WEIGHT.bold,
            display: "flex",
          }}
        >
          {MATCH_TYPE_LABEL[match.matchType] ?? "Partita"}
        </div>
      </div>

      {/* Date */}
      <div
        style={{
          fontSize: 26,
          color: HERO_TEXT.muted,
          fontWeight: FONT_WEIGHT.regular,
          marginBottom: 18,
          display: "flex",
          justifyContent: "center",
        }}
      >
        {formatRome(new Date(match.date), "EEEE d MMMM yyyy", { locale: it })}
      </div>

      {/* Score block */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 30,
          marginBottom: 24,
        }}
      >
        {/* Us */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            flex: 1,
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: 34,
              fontWeight: FONT_WEIGHT.bold,
              color: HERO_TEXT.primary,
              marginBottom: 8,
              textAlign: "center",
              display: "flex",
            }}
          >
            {match.team.name}
          </div>
          <div
            style={{
              fontSize: 140,
              fontWeight: FONT_WEIGHT.bold,
              lineHeight: 1,
              color: HERO_TEXT.primary,
              display: "flex",
            }}
          >
            {hasScore ? match.ourScore : "–"}
          </div>
        </div>

        {/* VS / Result chip */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            fontWeight: FONT_WEIGHT.bold,
            fontSize: 36,
            color: HERO_TEXT.muted,
          }}
        >
          <div style={{ display: "flex" }}>—</div>
        </div>

        {/* Them */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            flex: 1,
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: 34,
              fontWeight: FONT_WEIGHT.bold,
              color: HERO_TEXT.secondary,
              marginBottom: 8,
              textAlign: "center",
              display: "flex",
            }}
          >
            {opponentName}
          </div>
          <div
            style={{
              fontSize: 140,
              fontWeight: FONT_WEIGHT.bold,
              lineHeight: 1,
              color: HERO_TEXT.muted,
              display: "flex",
            }}
          >
            {hasScore ? match.theirScore : "–"}
          </div>
        </div>
      </div>

      {/* Result chip */}
      {meta && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 36 }}>
          <div
            style={{
              background: meta.color,
              color: OUTCOME.light.onFill,
              fontSize: 30,
              fontWeight: FONT_WEIGHT.bold,
              padding: "10px 32px",
              borderRadius: 30,
              letterSpacing: 4,
              display: "flex",
            }}
          >
            {meta.label}
          </div>
        </div>
      )}

      {/* MVP */}
      {mvps.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: 32,
            padding: "20px 32px",
            borderRadius: 16,
            background: MEDAL.dark.goldBg,
            border: `2px solid ${MEDAL.dark.goldDeep}`,
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: FONT_WEIGHT.bold,
              color: MEDAL.dark.gold,
              letterSpacing: 4,
              marginBottom: 10,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Star />
            MVP
            <Star />
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: FONT_WEIGHT.bold,
              color: HERO_TEXT.primary,
              textAlign: "center",
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 20,
            }}
          >
            {mvps.join(" · ")}
          </div>
        </div>
      )}

      {/* Top scorers */}
      {topScorers.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: FONT_WEIGHT.bold,
              color: HERO_TEXT.muted,
              letterSpacing: 4,
              marginBottom: 16,
              display: "flex",
            }}
          >
            MARCATORI
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {topScorers.map((s, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 20px",
                  background: HERO_TEXT.surface,
                  borderRadius: 10,
                  border: `1px solid ${HERO_TEXT.line}`,
                }}
              >
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: FONT_WEIGHT.bold,
                    color: HERO_TEXT.primary,
                    display: "flex",
                  }}
                >
                  {s.name}
                  {s.lastName && (
                    <span
                      style={{
                        color: HERO_TEXT.secondary,
                        marginLeft: 8,
                      }}
                    >
                      {s.lastName}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 30,
                    fontWeight: FONT_WEIGHT.bold,
                    color: HERO_TEXT.primary,
                    display: "flex",
                  }}
                >
                  {s.points}
                  <span
                    style={{
                      fontSize: 18,
                      color: HERO_TEXT.muted,
                      marginLeft: 4,
                      marginTop: 8,
                    }}
                  >
                    PT
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginTop: "auto",
          paddingTop: 24,
          fontSize: 20,
          color: HERO_TEXT.muted,
          fontWeight: FONT_WEIGHT.bold,
          letterSpacing: 2,
        }}
      >
        karibubaskin.it
      </div>
    </div>,
    {
      width: WIDTH,
      height: HEIGHT,
      headers: {
        // 5 min cache CDN + revalidate ogni richiesta server-side
        "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=60",
      },
    }
  );
}
