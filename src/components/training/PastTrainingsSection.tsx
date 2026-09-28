"use client";
import { useState } from "react";
import { Box, Button, Chip, Paper, Typography } from "@mui/material";
import Link from "next/link";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { useActiveDateLocale } from "@/hooks/useActiveDateLocale";
import { useEntityLabels } from "@/hooks/useEntityLabels";
import TrainingListRow from "@/components/training/TrainingListRow";
import { capitalize, useTrainingMeta } from "@/components/training/UpcomingTrainingsList";
import type { SessionWithCount } from "@/components/training/SessionCard";
import { groupByMonth, matchupTeams } from "@/lib/trainingList";
import { TYPE_SCALE } from "@/lib/typeScale";

export interface PastTraining extends SessionWithCount {
  /** Presenze segnate dallo staff; 0 = non segnate (si mostrano gli iscritti). */
  presentCount: number;
  /** Punteggi delle partitelle: solo numeri e colori, nessun nome. */
  results: { matchup: string | null; scoreA: number; scoreB: number }[];
  /** Chi guarda era iscritto e non e' stato segnato assente. */
  wasThere: boolean;
}

interface PastTrainingsSectionProps {
  sessions: PastTraining[];
  seasons: string[];
  season: string;
  /** null o 0: niente "tu c'eri" (senza accesso, o mai presente in stagione). */
  attendedCount: number | null;
  isStaff: boolean;
}

const PAGE = 10;

export default function PastTrainingsSection({
  sessions,
  seasons,
  season,
  attendedCount,
  isStaff,
}: PastTrainingsSectionProps) {
  const t = useTranslations("trainings");
  const dateLocale = useActiveDateLocale();
  const { teamColorLabel } = useEntityLabels();
  const meta = useTrainingMeta();
  const [shown, setShown] = useState(PAGE);
  // Cambiando stagione la lista riparte dai primi dieci.
  const [shownSeason, setShownSeason] = useState(season);
  if (shownSeason !== season) {
    setShownSeason(season);
    setShown(PAGE);
  }

  const visible = sessions.slice(0, shown);

  function resultLabel(r: PastTraining["results"][number]): string | null {
    const teams = matchupTeams(r.matchup);
    if (!teams) return null;
    return `${teamColorLabel(teams[0])} ${r.scoreA}–${r.scoreB} ${teamColorLabel(teams[1])}`;
  }

  function rowMeta(s: PastTraining) {
    const count =
      s.presentCount > 0
        ? t("presentCount", { count: s.presentCount })
        : t("registeredCount", { count: s._count.registrations });
    const parts = meta(s, count);
    const results = s.results.map(resultLabel).filter(Boolean).join(", ");
    if (results) parts.push(results);
    return parts;
  }

  return (
    <Box
      component="section"
      id="passati"
      aria-labelledby="passati-title"
      // Sotto l'header fisso quando si arriva da #passati.
      sx={{ mt: 6, scrollMarginTop: 88 }}
    >
      <Typography id="passati-title" component="h2" variant="h5" fontWeight={800} sx={{ mb: 1.5 }}>
        {t("pastTitle")}
      </Typography>

      {seasons.length > 1 && (
        <Box
          role="group"
          aria-label={t("seasonsLabel")}
          sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}
        >
          {seasons.map((s) => (
            <Link
              key={s}
              href={`/allenamenti?stagione=${encodeURIComponent(s)}#passati`}
              scroll={false}
              aria-current={s === season ? "true" : undefined}
              style={{ textDecoration: "none" }}
            >
              <Chip
                label={s}
                size="small"
                variant={s === season ? "filled" : "outlined"}
                color={s === season ? "primary" : "default"}
                sx={{ cursor: "pointer", fontWeight: 600, fontSize: TYPE_SCALE.xs }}
              />
            </Link>
          ))}
        </Box>
      )}

      {sessions.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          {t("nonePastSeason")}
        </Typography>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {attendedCount
              ? t("seasonSummaryMine", { total: sessions.length, attended: attendedCount })
              : t("sessionCount", { count: sessions.length })}
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            {groupByMonth(visible).map(({ month, items }) => (
              <Box key={items[0].id}>
                <Typography
                  component="h3"
                  variant="subtitle2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  {capitalize(format(month, "LLLL yyyy", { locale: dateLocale }))}
                </Typography>
                <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
                  {items.map((s, i) => (
                    <Box key={s.id} sx={{ borderTop: i > 0 ? 1 : 0, borderColor: "divider" }}>
                      <TrainingListRow
                        session={s}
                        isStaff={isStaff}
                        meta={rowMeta(s)}
                        trailing={
                          s.wasThere ? (
                            <Chip
                              label={t("youWereThere")}
                              size="small"
                              color="success"
                              variant="outlined"
                              sx={{ fontWeight: 700 }}
                            />
                          ) : null
                        }
                      />
                    </Box>
                  ))}
                </Paper>
              </Box>
            ))}
          </Box>

          {shown < sessions.length && (
            <Box sx={{ textAlign: "center", mt: 2 }}>
              <Button onClick={() => setShown((n) => n + PAGE)} sx={{ fontWeight: 600 }}>
                {t("showMore", { count: Math.min(PAGE, sessions.length - shown) })}
              </Button>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
