import { Box, Link as MuiLink, Paper, Stack, Typography } from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import { getTranslations } from "next-intl/server";
import TeamAvatar from "@/components/teams/TeamAvatar";
import MatchSectionTitle from "@/components/matches/sections/MatchSectionTitle";
import { getBadgeById } from "@/lib/rating/badges";
import { getBadgeI18n } from "@/lib/rating/badgeLabels";
import type { ForYouRow } from "@/lib/matches/afterMatch";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { RADIUS } from "@/lib/radius";

interface MatchForYouSectionProps {
  rows: ForYouRow[];
  /** Tinta della squadra per gli avatar; null nelle amichevoli interne. */
  teamColor: string | null;
}

/**
 * "Per te" (UX-58): la riga che il genitore cerca nella tabella, in cima alla
 * pagina della partita giocata. Solo per i tesserati con un giocatore della
 * famiglia in partita: chi la chiama ha già controllato.
 */
export default async function MatchForYouSection({ rows, teamColor }: MatchForYouSectionProps) {
  const [t, { translate }] = await Promise.all([
    getTranslations("matches.afterMatch"),
    getBadgeI18n(),
  ]);
  if (rows.length === 0) return null;

  return (
    <Box
      component="section"
      aria-labelledby="per-te-title"
      id="per-te"
      sx={{ scrollMarginTop: 80 }}
    >
      <MatchSectionTitle id="per-te-title" icon={<FavoriteIcon />}>
        {t("forYouTitle")}
      </MatchSectionTitle>
      <Stack spacing={1}>
        {rows.map((row) => {
          const statLine = !row.stat
            ? t("statsComing")
            : row.stat.points === 0
              ? t("playedNoPoints")
              : [
                  t("points", { count: row.stat.points }),
                  row.stat.attempted > 0
                    ? t("shots", { made: row.stat.made, attempted: row.stat.attempted })
                    : null,
                ]
                  .filter((x) => x !== null)
                  .join(" · ");
          const badges = row.badgeIds
            .map(getBadgeById)
            .filter((b) => !!b)
            .map((b) => translate(b));
          return (
            <Paper
              key={row.key}
              variant="outlined"
              sx={{ p: 2, borderRadius: RADIUS.lg, display: "flex", gap: 1.5 }}
            >
              <TeamAvatar name={row.name} image={row.image} color={teamColor} size={40} />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body1" sx={{ fontWeight: FONT_WEIGHT.semibold }}>
                  {row.profileSlug ? (
                    <MuiLink
                      href={`/giocatori/${row.profileSlug}`}
                      underline="hover"
                      color="inherit"
                    >
                      {row.name}
                    </MuiLink>
                  ) : (
                    row.name
                  )}
                  {row.isViewer && (
                    <Typography component="span" variant="body2" color="text.secondary">
                      {` · ${t("you")}`}
                    </Typography>
                  )}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {statLine}
                </Typography>
                {badges.map((b) => (
                  <Typography key={b.id} variant="body2" sx={{ mt: 0.5 }}>
                    {t("newBadge", { label: b.label })} <span aria-hidden="true">{b.emoji}</span>
                  </Typography>
                ))}
              </Box>
            </Paper>
          );
        })}
      </Stack>
    </Box>
  );
}
