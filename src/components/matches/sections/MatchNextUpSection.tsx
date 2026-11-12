import { Box, Paper, Typography } from "@mui/material";
import EventIcon from "@mui/icons-material/Event";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import UpcomingMatchRow from "@/components/matches/UpcomingMatchRow";
import MatchSectionTitle from "@/components/matches/sections/MatchSectionTitle";
import ShareSection from "@/components/common/ShareSection";
import type { NextUp } from "@/lib/matches/afterMatch";
import { trainingLocation } from "@/lib/clubVenue";
import { getDateFnsLocale } from "@/lib/dateLocale";
import { formatRome } from "@/lib/dateUtils";
import { FONT_WEIGHT } from "@/lib/fontWeight";

interface MatchNextUpSectionProps {
  next: NextUp;
  /** Condivisione della partita (UX-56). */
  share: { title: string; path: string };
}

/**
 * "E adesso" (UX-58): in fondo alla partita giocata, il passo successivo. La
 * prossima partita della squadra, o il prossimo allenamento; sotto, la riga
 * per condividere la partita. Senza nessuno dei due resta solo la condivisione.
 */
export default async function MatchNextUpSection({ next, share }: MatchNextUpSectionProps) {
  const [t, locale] = await Promise.all([getTranslations("matches.afterMatch"), getLocale()]);
  const dateLocale = getDateFnsLocale(locale);

  return (
    <Box component={next ? "section" : "div"} aria-labelledby={next ? "next-up-title" : undefined}>
      {next && (
        <>
          <MatchSectionTitle id="next-up-title" icon={<EventIcon />}>
            {t("nextUpTitle")}
          </MatchSectionTitle>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {next.kind === "match" ? t("nextMatch") : t("nextTraining")}
          </Typography>
          {next.kind === "match" ? (
            <UpcomingMatchRow
              match={next.match}
              teamName={next.teamName}
              teamColor={next.teamColor}
            />
          ) : (
            <Link href={next.href} style={{ textDecoration: "none" }}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  transition: "border-color 0.15s",
                  "&:hover": { borderColor: "primary.main" },
                  "&:hover .next-up-arrow": { color: "primary.main" },
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: FONT_WEIGHT.semibold }}>
                    {next.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                    {formatRome(next.date, "EEEE d MMMM · HH:mm", { locale: dateLocale }).replace(
                      /^./,
                      (c) => c.toUpperCase()
                    )}
                    {" · "}
                    {trainingLocation(next.location)}
                  </Typography>
                </Box>
                <ChevronRightIcon className="next-up-arrow" sx={{ color: "text.secondary" }} />
              </Paper>
            </Link>
          )}
        </>
      )}
      <Box sx={{ mt: next ? 3 : 0 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {t("shareHint")}
        </Typography>
        <ShareSection title={share.title} path={share.path} kind="match" />
      </Box>
    </Box>
  );
}
