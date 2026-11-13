import { Box, Container } from "@mui/material";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import PageHero from "@/components/common/PageHero";
import GameArt, { type ArtTeam } from "@/components/games/GameArt";
import GameCard from "@/components/games/GameCard";
import { auth } from "@/lib/authjs";
import { isMemberRole } from "@/lib/authRoles";
import { prisma } from "@/lib/db";
import { getDateFnsLocale } from "@/lib/dateLocale";
import { formatRome } from "@/lib/dateUtils";
import { gamesGridColumns } from "@/lib/games/gameArt";
import { gameAccess, gamesAreIndexable, type GameAccess } from "@/lib/games/gameSettings";
import { loadGameSettings, loadQuizSummaries } from "@/lib/games/loadGameSettings";
import { loadNextPredictionMatch, loadOwnPrediction } from "@/lib/games/loadPredictions";
import { quizPath } from "@/lib/games/quiz";
import { quizAccess } from "@/lib/games/quizRules";
import { columnSx } from "@/lib/layout";
import { PUBLIC_TEAM_WHERE } from "@/lib/matches/mixedTeam";
import { getCurrentSeasonLabel } from "@/lib/season/activeSeason";
import { buildMetadata } from "@/lib/seo";
import { teamFill } from "@/lib/teamColors";

export async function generateMetadata() {
  const settings = await loadGameSettings();
  return buildMetadata({
    title: "Giochi",
    description:
      "I giochi del Karibu Baskin: il quiz sul baskin e il pronostico della prossima partita.",
    path: "/giochi",
    // In sitemap e indicizzata solo con il quiz per tutti (UX-66).
    noindex: !gamesAreIndexable(settings),
  });
}

/** Una card della griglia, prima di essere disegnata. */
interface CardSpec {
  key: string;
  access: GameAccess;
  href: string | null;
  art: React.ReactNode;
  title: string;
  line: string;
}

const loginHref = (back: string) => `/login?callbackUrl=${encodeURIComponent(back)}`;

const artTeam = (name: string, color: string | null): ArtTeam => {
  const fill = teamFill(color);
  return {
    initial: name.trim().charAt(0).toLocaleUpperCase("it") || "?",
    fill: fill && { bg: fill.bg, fg: fill.fg },
  };
};

/** Le prime due squadre della stagione in corso, per il disegno della sfida. */
async function loadSimulatorTeams(): Promise<[ArtTeam, ArtTeam]> {
  const season = await getCurrentSeasonLabel();
  const teams = await prisma.competitiveTeam.findMany({
    where: { season, isMixed: false, ...PUBLIC_TEAM_WHERE },
    orderBy: { name: "asc" },
    take: 2,
    select: { name: true, color: true },
  });
  const neutral = (initial: string): ArtTeam => ({ initial, fill: null });
  return [
    teams[0] ? artTeam(teams[0].name, teams[0].color) : neutral("?"),
    teams[1] ? artTeam(teams[1].name, teams[1].color) : neutral("?"),
  ];
}

// Giochi del club (UX-61, UX-68): una card per gioco su una griglia, con un
// disegno grande, il titolo e una riga. Chi vede cosa lo decide l'admin in
// `/admin/giochi` (UX-66): un gioco spento lo vedono solo allenatori e admin,
// e per loro la card sembra spenta; un gioco dei tesserati, a chi non lo è, si
// mostra col lucchetto e porta all'accesso.
export default async function GiochiPage() {
  const now = new Date();
  const [t, locale, session, settings, quizzes] = await Promise.all([
    getTranslations("pages.games"),
    getLocale(),
    auth(),
    loadGameSettings(),
    loadQuizSummaries(),
  ]);
  const role = session?.user?.appRole;
  const userId = session?.user?.id ?? null;
  const member = Boolean(userId) && isMemberRole(role);
  const en = locale === "en";

  const quizList = quizzes
    .map((q) => ({ ...q, access: quizAccess(q, role, locale) }))
    .filter((q) => q.access !== "hidden");
  const prediction = gameAccess(settings.prediction, role);
  const simulator = gameAccess(settings.simulator, role);
  // Nessun gioco per chi guarda: la pagina non esiste.
  if (quizList.length === 0 && prediction === "hidden" && simulator === "hidden") notFound();

  const [nextMatch, bests, simTeams] = await Promise.all([
    prediction === "hidden" ? null : loadNextPredictionMatch(now),
    member && quizList.length > 0
      ? prisma.quizBest.findMany({
          where: { userId: userId!, quizId: { in: quizList.map((q) => q.id) } },
          select: { quizId: true, best: true },
        })
      : [],
    simulator === "hidden" ? null : loadSimulatorTeams(),
  ]);
  const ownPrediction =
    nextMatch && member && prediction !== "members"
      ? await loadOwnPrediction(nextMatch.id, userId!)
      : null;
  const bestByQuiz = new Map(bests.map((b) => [b.quizId, b.best]));
  const dateLocale = getDateFnsLocale(locale);

  const cards: CardSpec[] = [];

  for (const q of quizList) {
    const best = bestByQuiz.get(q.id);
    cards.push({
      key: q.id,
      access: q.access,
      href: q.access === "members" ? loginHref(quizPath(q.slug)) : quizPath(q.slug),
      art: <GameArt kind="quiz" art={q.art} />,
      title: (en ? q.titleEn : null) ?? q.title,
      line:
        q.access === "members"
          ? t("signInToPlay")
          : best !== undefined
            ? t("quizBest", { best, total: q.counts.perGame })
            : ((en ? q.descriptionEn : null) ?? q.description),
    });
  }

  if (prediction !== "hidden") {
    const matchHref = nextMatch && `/partite/${nextMatch.slug ?? nextMatch.id}#pronostico`;
    const ours = nextMatch && artTeam(nextMatch.teamName, nextMatch.teamColor);
    const theirs = nextMatch && artTeam(nextMatch.opponentName, null);
    cards.push({
      key: "prediction",
      access: prediction,
      href: prediction === "members" ? loginHref(matchHref ?? "/giochi") : matchHref,
      art:
        nextMatch && ours && theirs ? (
          <GameArt
            kind="prediction"
            left={nextMatch.isHome ? ours : theirs}
            right={nextMatch.isHome ? theirs : ours}
            when={formatRome(nextMatch.date, "EEE d MMM · HH:mm", { locale: dateLocale })}
          />
        ) : (
          <GameArt kind="prediction-waiting" />
        ),
      title: t("predictionTitle"),
      line:
        prediction === "members"
          ? t("signInToPlay")
          : !nextMatch
            ? t("predictionWaiting")
            : ownPrediction
              ? t(`predictionSaid.${ownPrediction.outcome}`)
              : t("predictionMatch", {
                  match: nextMatch.isHome
                    ? `${nextMatch.teamName} – ${nextMatch.opponentName}`
                    : `${nextMatch.opponentName} – ${nextMatch.teamName}`,
                  day: formatRome(nextMatch.date, "EEEE", { locale: dateLocale }),
                }),
    });
  }

  if (simulator !== "hidden" && simTeams) {
    cards.push({
      key: "simulator",
      access: simulator,
      href: simulator === "members" ? loginHref("/giochi/sfida") : "/giochi/sfida",
      art: <GameArt kind="simulator" left={simTeams[0]} right={simTeams[1]} />,
      title: t("simulatorTitle"),
      line: simulator === "members" ? t("signInToPlay") : t("simulatorLine"),
    });
  }

  // I giochi spenti (anteprima dello staff) vanno in fondo: lo staff vede la
  // pagina nell'ordine in cui la vedono gli altri.
  const ordered = [
    ...cards.filter((c) => c.access !== "preview"),
    ...cards.filter((c) => c.access === "preview"),
  ];
  const columns = gamesGridColumns(ordered.length);

  return (
    <>
      <PageHero column="full" title={t("title")} />
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Box
          component="ul"
          sx={{
            ...columnSx("full"),
            listStyle: "none",
            p: 0,
            m: 0,
            display: "grid",
            gap: { xs: 2, md: 2.5 },
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              sm: "repeat(2, minmax(0, 1fr))",
              md: `repeat(${columns}, minmax(0, 1fr))`,
            },
          }}
        >
          {ordered.map((c) => (
            <Box component="li" key={c.key} sx={{ minWidth: 0 }}>
              <GameCard
                href={c.href}
                art={c.art}
                title={c.title}
                line={c.line}
                lineIsAction={c.access === "members"}
                lockedLabel={c.access === "members" ? t("membersOnly") : undefined}
                offLabel={c.access === "preview" ? t("offForOthers") : undefined}
              />
            </Box>
          ))}
        </Box>
      </Container>
    </>
  );
}
