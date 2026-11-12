import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { Box, Paper, Stack, Typography } from "@mui/material";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import DirectionsRunIcon from "@mui/icons-material/DirectionsRun";
import StarIcon from "@mui/icons-material/Star";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import MilitaryTechIcon from "@mui/icons-material/MilitaryTech";
import GroupsIcon from "@mui/icons-material/Groups";
import { RADIUS } from "@/lib/radius";
import { TYPE_SCALE } from "@/lib/typeScale";
import { teamFill } from "@/lib/teamColors";
import { getBadgeI18n } from "@/lib/rating/badgeLabels";
import type { SeasonRecap } from "@/lib/season/seasonRecap";
import SeasonRecapShareButton from "@/components/profile/SeasonRecapShareButton";

interface SeasonRecapViewProps {
  recap: SeasonRecap;
  /** Il proprio riepilogo, o quello di un figlio (frasi in terza persona). */
  self: boolean;
  name: string;
  firstName: string;
  minor: boolean;
}

interface RecapCardProps {
  icon: ReactNode;
  title: string;
  stat?: string;
  children?: ReactNode;
}

/** Una voce: titolo `h2` (per il lettore di schermo), il numero grande e la frase. */
function RecapCard({ icon, title, stat, children }: RecapCardProps) {
  return (
    <Paper
      component="section"
      variant="outlined"
      sx={{ borderRadius: RADIUS.lg, p: { xs: 3, sm: 4 } }}
    >
      <Typography
        component="h2"
        variant="h6"
        sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary" }}
      >
        <Box component="span" aria-hidden sx={{ display: "flex", color: "primary.main" }}>
          {icon}
        </Box>
        {title}
      </Typography>
      {stat && (
        <Typography
          variant="stat"
          component="p"
          sx={{ mt: 1.5, fontSize: { xs: TYPE_SCALE.xl7, sm: TYPE_SCALE.xl8 } }}
        >
          {stat}
        </Typography>
      )}
      {children && <Box sx={{ mt: 1 }}>{children}</Box>}
    </Paper>
  );
}

/**
 * "La tua stagione" (UX-60): una card per voce, una sotto l'altra, da leggere
 * scorrendo (niente carosello). Le voci a zero non ci sono; nessun numero è
 * confrontato con quello di altri.
 */
export default async function SeasonRecapView({
  recap,
  self,
  name,
  firstName,
  minor,
}: SeasonRecapViewProps) {
  const [t, locale, badgeI18n] = await Promise.all([
    getTranslations("seasonRecap"),
    getLocale(),
    getBadgeI18n(),
  ]);
  const who = self ? "self" : "other";
  const dateFmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "it-IT", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Rome",
  });
  const team = recap.teams[0] ?? null;
  const fill = teamFill(team?.color);

  if (!recap.hasData) {
    return (
      <Paper variant="outlined" sx={{ borderRadius: RADIUS.lg, p: { xs: 3, sm: 4 } }}>
        <Typography component="h2" variant="h6">
          {t("empty.title")}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          {t("empty.text")}
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={2.5}>
      {/* Apertura: nome e squadra, nella tinta della squadra (grafite senza tinta). */}
      <Paper
        component="section"
        elevation={0}
        sx={{
          borderRadius: RADIUS.lg,
          p: { xs: 3, sm: 4 },
          bgcolor: fill?.bg ?? "secondary.main",
          color: fill?.fg ?? "secondary.contrastText",
          ...(fill?.ring ? { outline: `2px solid ${fill.ring}` } : {}),
        }}
      >
        <Typography
          component="p"
          variant="overline"
          sx={{ color: "inherit", typography: "caption", letterSpacing: 2 }}
        >
          {t("intro.kicker", { season: recap.season })}
        </Typography>
        <Typography component="h2" variant="h3" sx={{ color: "inherit", mt: 0.5 }}>
          {name}
        </Typography>
        <Typography sx={{ color: "inherit", mt: 1 }}>
          {recap.teams.length > 0
            ? t("intro.teams", { teams: recap.teams.map((tm) => tm.name).join(", ") })
            : t("intro.noTeam")}
        </Typography>
      </Paper>

      {recap.trainings && (
        <RecapCard
          icon={<DirectionsRunIcon />}
          title={t("trainings.title")}
          stat={String(recap.trainings.attended)}
        >
          <Typography variant="h6" component="p">
            {t("trainings.count", { count: recap.trainings.attended })}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            {t(`trainings.tone_${recap.trainings.tone}`, {
              attended: recap.trainings.share?.attended ?? recap.trainings.attended,
              total: recap.trainings.share?.total ?? 0,
            })}
          </Typography>
        </RecapCard>
      )}

      {recap.matches && (
        <RecapCard
          icon={<SportsBasketballIcon />}
          title={t("matches.title")}
          stat={String(recap.matches.played)}
        >
          <Typography variant="h6" component="p">
            {t("matches.count", { count: recap.matches.played })}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            {t("matches.points", { count: recap.matches.points })}
          </Typography>
        </RecapCard>
      )}

      {recap.matches?.best && (
        <RecapCard
          icon={<StarIcon />}
          title={t("best.title", { who })}
          stat={t("best.points", { count: recap.matches.best.points })}
        >
          <Typography color="text.secondary">
            {recap.matches.best.opponentName
              ? t("best.lineVs", {
                  opponent: recap.matches.best.opponentName,
                  date: dateFmt.format(recap.matches.best.date),
                })
              : t("best.line", { date: dateFmt.format(recap.matches.best.date) })}
          </Typography>
        </RecapCard>
      )}

      {recap.mvp && (
        <RecapCard
          icon={<EmojiEventsIcon />}
          title={t("mvp.title")}
          stat={t("mvp.count", { count: recap.mvp })}
        >
          <Typography color="text.secondary">{t("mvp.line")}</Typography>
        </RecapCard>
      )}

      {recap.badges.length > 0 && (
        <RecapCard
          icon={<MilitaryTechIcon />}
          title={t("badges.title")}
          stat={String(recap.badges.length)}
        >
          <Typography variant="h6" component="p">
            {t("badges.count", { count: recap.badges.length })}
          </Typography>
          <Box component="ul" sx={{ listStyle: "none", p: 0, m: 0, mt: 1.5 }}>
            {recap.badges.map((b) => {
              const label = badgeI18n.translate(b, { self }).label;
              return (
                <Box
                  component="li"
                  key={b.id}
                  sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 0.75 }}
                >
                  <Box component="span" aria-hidden sx={{ typography: "h5", lineHeight: 1 }}>
                    {b.emoji}
                  </Box>
                  <Typography>{label}</Typography>
                </Box>
              );
            })}
          </Box>
        </RecapCard>
      )}

      <RecapCard icon={<GroupsIcon />} title={t("club.title")}>
        <Typography color="text.secondary">{t("club.line", { season: recap.season })}</Typography>
        <Box
          component="ul"
          sx={{
            listStyle: "none",
            p: 0,
            m: 0,
            mt: 1.5,
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
            gap: 2,
          }}
        >
          {(
            [
              ["trainings", recap.club.trainings],
              ["matches", recap.club.matches],
              ["points", recap.club.points],
            ] as const
          ).map(([key, value]) => (
            <Box component="li" key={key}>
              <Typography variant="h4" component="p">
                {value}
              </Typography>
              <Typography color="text.secondary">{t(`club.${key}`, { count: value })}</Typography>
            </Box>
          ))}
        </Box>
      </RecapCard>

      {recap.highlights.length > 0 && (
        <Paper
          component="section"
          variant="outlined"
          sx={{ borderRadius: RADIUS.lg, p: { xs: 3, sm: 4 } }}
        >
          <Typography component="h2" variant="h6" sx={{ mb: 1 }}>
            {t("share.title", { who })}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {t("share.intro")}
          </Typography>
          <SeasonRecapShareButton
            self={self}
            minor={minor}
            data={{
              firstName,
              season: recap.season,
              teamColor: team?.color ?? null,
              teamName: team?.name ?? null,
              highlights: recap.highlights,
            }}
          />
        </Paper>
      )}
    </Stack>
  );
}
