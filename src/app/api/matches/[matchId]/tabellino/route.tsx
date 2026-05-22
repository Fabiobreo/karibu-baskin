import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db";
import { format } from "date-fns";
import { it } from "date-fns/locale";

// Node runtime (default) — necessario perché usiamo Prisma.
export const dynamic = "force-dynamic";

const WIDTH = 1080;
const HEIGHT = 1350;

const MATCH_TYPE_LABEL: Record<string, string> = {
  LEAGUE: "Campionato",
  TOURNAMENT: "Torneo",
  FRIENDLY: "Amichevole",
};

const RESULT_META: Record<
  "WIN" | "LOSS" | "DRAW",
  { label: string; color: string; gradient: string }
> = {
  WIN: {
    label: "VITTORIA",
    color: "#2E7D32",
    gradient: "linear-gradient(150deg, #0E1F0E 0%, #163B16 60%, #1F5A1F 100%)",
  },
  LOSS: {
    label: "SCONFITTA",
    color: "#C62828",
    gradient: "linear-gradient(150deg, #1F0E0E 0%, #3B1616 60%, #5A1F1F 100%)",
  },
  DRAW: {
    label: "PAREGGIO",
    color: "#E65100",
    gradient: "linear-gradient(150deg, #1A1A1A 0%, #2D1A0A 60%, #3D2010 100%)",
  },
};

type Params = { params: Promise<{ matchId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { matchId } = await params;

  const match = await prisma.match.findFirst({
    where: { OR: [{ id: matchId }, { slug: matchId }] },
    include: {
      team: { select: { name: true, color: true } },
      opponent: { select: { name: true } },
      opponentTeam: { select: { name: true } },
      playerStats: {
        orderBy: { points: "desc" },
        take: 5,
        include: {
          user: { select: { name: true, sportRole: true } },
          child: { select: { name: true, sportRole: true } },
        },
      },
      mvps: {
        include: {
          user: { select: { name: true } },
          child: { select: { name: true } },
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
  const background =
    meta?.gradient ?? "linear-gradient(150deg, #1A1A1A 0%, #2D1A0A 60%, #3D2010 100%)";

  const topScorers = match.playerStats
    .filter((s) => s.points > 0)
    .map((s) => ({
      name: (s.user?.name ?? s.child?.name ?? "—").split(" ")[0],
      lastName: (s.user?.name ?? s.child?.name ?? "").split(" ").slice(1).join(" ") || "",
      points: s.points,
    }));

  const mvps = match.mvps
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
        color: "#fff",
        fontFamily: "sans-serif",
        padding: "60px 60px 40px 60px",
        position: "relative",
      }}
    >
      {/* Decorative circle */}
      <div
        style={{
          position: "absolute",
          top: -100,
          right: -100,
          width: 380,
          height: 380,
          borderRadius: "50%",
          background: "rgba(230,81,0,0.12)",
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
          background: "rgba(230,81,0,0.08)",
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
            background: "#E65100",
            color: "#fff",
            fontSize: 22,
            fontWeight: 800,
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
            color: "rgba(255,255,255,0.55)",
            fontWeight: 600,
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
          color: "rgba(255,255,255,0.6)",
          fontWeight: 500,
          marginBottom: 18,
          display: "flex",
          justifyContent: "center",
        }}
      >
        {format(new Date(match.date), "EEEE d MMMM yyyy", { locale: it })}
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
              fontWeight: 800,
              color: "#fff",
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
              fontWeight: 900,
              lineHeight: 1,
              color: "#fff",
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
            fontWeight: 800,
            fontSize: 36,
            color: "rgba(255,255,255,0.35)",
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
              fontWeight: 800,
              color: "rgba(255,255,255,0.85)",
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
              fontWeight: 900,
              lineHeight: 1,
              color: "rgba(255,255,255,0.65)",
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
              color: "#fff",
              fontSize: 30,
              fontWeight: 900,
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
            background: "rgba(249,168,37,0.18)",
            border: "2px solid rgba(249,168,37,0.6)",
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "#FFD54F",
              letterSpacing: 4,
              marginBottom: 10,
              display: "flex",
            }}
          >
            ★ MVP ★
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: "#fff",
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
              fontWeight: 800,
              color: "rgba(255,255,255,0.55)",
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
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 700,
                    color: "#fff",
                    display: "flex",
                  }}
                >
                  {s.name}
                  {s.lastName && (
                    <span
                      style={{
                        color: "rgba(255,255,255,0.7)",
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
                    fontWeight: 900,
                    color: "#E65100",
                    display: "flex",
                  }}
                >
                  {s.points}
                  <span
                    style={{
                      fontSize: 18,
                      color: "rgba(230,81,0,0.7)",
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
          color: "rgba(255,255,255,0.4)",
          fontWeight: 600,
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
