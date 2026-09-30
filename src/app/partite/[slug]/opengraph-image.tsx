import { ImageResponse } from "next/og";
import { loadInterFonts } from "@/lib/og/fonts";
import { prisma } from "@/lib/db";
import { it } from "date-fns/locale";
import { formatRome } from "@/lib/dateUtils";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { BRAND, HERO, HERO_TEXT, OUTCOME } from "@/lib/palette";
import { teamColor } from "@/lib/teamColors";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = { params: Promise<{ slug: string }> };

// Esiti (UX-29): fondo grafite che sfuma nella velatura scura dell'esito. La
// parola ("Vittoria"…) resta nella riga di dettaglio, il colore non è da solo.
const RESULT_META = {
  WIN: {
    label: "Vittoria",
    bg: `linear-gradient(150deg, ${BRAND.dark} 0%, ${OUTCOME.dark.winBg} 100%)`,
  },
  LOSS: {
    label: "Sconfitta",
    bg: `linear-gradient(150deg, ${BRAND.dark} 0%, ${OUTCOME.dark.lossBg} 100%)`,
  },
  DRAW: {
    label: "Pareggio",
    bg: `linear-gradient(150deg, ${BRAND.dark} 0%, ${OUTCOME.dark.drawBg} 100%)`,
  },
};

const MATCH_TYPE_LABEL: Record<string, string> = {
  LEAGUE: "Campionato",
  TOURNAMENT: "Torneo",
  FRIENDLY: "Amichevole",
};

const DEFAULT_BG = `linear-gradient(150deg, ${HERO.from} 0%, ${HERO.to} 100%)`;

export default async function OgImage({ params }: Props) {
  const { slug } = await params;
  const fonts = await loadInterFonts([FONT_WEIGHT.regular, FONT_WEIGHT.bold]);

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
      group: { select: { name: true } },
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
          color: HERO_TEXT.primary,
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
  // Senza tinta squadra nessuna fascia (mai l'arancio come ripiego).
  const tint = teamColor(match.team.color);

  // Stessa composizione del tabellino della pagina (UX-35): chi gioca in casa
  // a sinistra, nome sopra e punteggio sotto, esito e competizione in una riga.
  const home = match.isHome
    ? { name: match.team.name, score: match.ourScore }
    : { name: opponentName, score: match.theirScore };
  const away = match.isHome
    ? { name: opponentName, score: match.theirScore }
    : { name: match.team.name, score: match.ourScore };
  const nameLong = Math.max(match.team.name.length, opponentName.length) > 22;
  const nameStyle = {
    fontSize: nameLong ? 36 : 48,
    fontWeight: FONT_WEIGHT.bold,
    lineHeight: 1.1,
    textAlign: "center" as const,
    display: "flex",
    justifyContent: "center",
    marginBottom: 12,
  };
  const scoreStyle = {
    fontSize: 140,
    fontWeight: FONT_WEIGHT.bold,
    lineHeight: 1,
    display: "flex",
  };
  const side = (name: string, score: number | null) => (
    <div
      style={{
        width: 420,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: hasScore ? "flex-end" : "center",
      }}
    >
      <div style={nameStyle}>{name}</div>
      {hasScore && <div style={scoreStyle}>{score}</div>}
    </div>
  );
  const detail = [
    meta?.label ?? null,
    MATCH_TYPE_LABEL[match.matchType] ?? null,
    match.group?.name ?? null,
  ]
    .filter((x): x is string => !!x)
    .join(" · ");

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
        color: HERO_TEXT.primary,
        fontFamily: "Inter, sans-serif",
        ...(tint ? { borderBottom: `12px solid ${tint}` } : {}),
      }}
    >
      <div
        style={{
          fontSize: 22,
          fontWeight: FONT_WEIGHT.bold,
          letterSpacing: 4,
          color: HERO_TEXT.secondary,
          marginBottom: 40,
          display: "flex",
        }}
      >
        KARIBU BASKIN
      </div>

      {/* Tabellino: [casa · punteggio] – [punteggio · ospiti] */}
      <div
        style={{
          display: "flex",
          alignItems: hasScore ? "flex-end" : "center",
          gap: 32,
          marginBottom: 36,
        }}
      >
        {side(home.name, home.score)}
        <div
          style={{
            fontSize: hasScore ? 80 : 56,
            fontWeight: FONT_WEIGHT.bold,
            lineHeight: 1,
            color: HERO_TEXT.muted,
            display: "flex",
            paddingBottom: hasScore ? 24 : 16,
          }}
        >
          {hasScore ? "–" : formatRome(new Date(match.date), "HH:mm")}
        </div>
        {side(away.name, away.score)}
      </div>

      {detail && (
        <div
          style={{ fontSize: 30, fontWeight: FONT_WEIGHT.bold, marginBottom: 14, display: "flex" }}
        >
          {detail}
        </div>
      )}
      <div
        style={{
          fontSize: 26,
          color: HERO_TEXT.secondary,
          fontWeight: FONT_WEIGHT.bold,
          display: "flex",
        }}
      >
        {formatRome(new Date(match.date), "EEEE d MMMM yyyy", { locale: it })}
      </div>
    </div>,
    { ...size, fonts }
  );
}
