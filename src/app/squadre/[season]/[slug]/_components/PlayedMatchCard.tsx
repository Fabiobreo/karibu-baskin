import { getTranslations, getLocale } from "next-intl/server";
import { getDateFnsLocale } from "@/lib/dateLocale";
import { getEntityLabels } from "@/lib/entityLabels";
import PlayedMatchRow from "@/components/matches/PlayedMatchRow";
import type { AnyMatch } from "./types";
import { formatRome } from "@/lib/dateUtils";

export default async function PlayedMatchCard({
  match,
  teamName,
}: {
  match: AnyMatch;
  teamName: string;
  teamColor: string | null;
}) {
  const [t, locale, { matchResultLabel }] = await Promise.all([
    getTranslations("matches"),
    getLocale(),
    getEntityLabels(),
  ]);
  const dateLocale = getDateFnsLocale(locale);
  const matchTypeLabel = (ty: string) =>
    ({ LEAGUE: t("typeLeague"), TOURNAMENT: t("typeTournament"), FRIENDLY: t("typeFriendly") })[
      ty
    ] ?? ty;

  return (
    <PlayedMatchRow
      href={`/partite/${match.slug ?? match.id}`}
      dateLabel={formatRome(new Date(match.date), "d MMM yyyy", { locale: dateLocale })}
      metaLabel={`${match.isHome ? t("home") : t("away")} · ${matchTypeLabel(match.matchType)}`}
      isHome={match.isHome}
      ourName={teamName}
      theirName={match.opponent.name}
      ourScore={match.ourScore}
      theirScore={match.theirScore}
      result={match.result}
      resultLabel={match.result ? matchResultLabel(match.result) : null}
    />
  );
}
