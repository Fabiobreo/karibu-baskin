"use client";
import { Box, Paper, Typography } from "@mui/material";
import { visuallyHidden } from "@mui/utils";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import { useTranslations } from "next-intl";
import { TEAM_META } from "@/lib/constants";
import { bibDotSx } from "@/lib/bib";
import { useEntityLabels } from "@/hooks/useEntityLabels";
import { MIN_TEAM_SIZE, percentPair, teamBalance } from "@/lib/rating/teamBalance";
import type { AthleteLevel, LevelBand } from "@/lib/rating/levelBands";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";

/** Livello stimato degli iscritti, per id dell'iscrizione (solo staff, UX-54). */
export type TeamLevels = Record<string, AthleteLevel>;

const BAND_ICON = {
  alta: KeyboardArrowUpRoundedIcon,
  media: RemoveRoundedIcon,
  bassa: KeyboardArrowDownRoundedIcon,
} as const;

/**
 * Segno della fascia accanto a un nome: freccia su, trattino, freccia giù, in
 * grigio. La forma è il segnale, il nome della fascia lo leggono i lettori di
 * schermo e lo mostra il suggerimento.
 */
export function BandMark({
  band,
  inherit = false,
}: {
  band: LevelBand;
  /** Sul fondo arancio di un chip selezionato il grigio non si legge. */
  inherit?: boolean;
}) {
  const t = useTranslations("trainings");
  const Icon = BAND_ICON[band];
  const label = t(`band.${band}`);
  return (
    <Box
      component="span"
      title={label}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        verticalAlign: "middle",
        whiteSpace: "nowrap",
        color: inherit ? "inherit" : "text.secondary",
      }}
    >
      <Icon aria-hidden="true" fontSize="small" />
      <Box component="span" sx={visuallyHidden}>
        {label}
      </Box>
    </Box>
  );
}

interface TeamBalanceBarProps {
  teams: { id: string }[][];
  levels: TeamLevels;
  /** Anteprima in modifica: come cambierebbe l'equilibrio spostando i selezionati. */
  previews?: { targetIndex: number; teams: { id: string }[][] }[];
}

/**
 * Equilibrio fra le squadre, solo per allenatori e admin (UX-54). Due squadre:
 * "Squadre equilibrate" o chi è in vantaggio, la percentuale di ciascuna e la
 * forza (livello medio). Tre squadre: solo la forza. Mai un numero accanto a
 * un nome (UX-40): per le persone c'è la fascia.
 */
export default function TeamBalanceBar({ teams, levels, previews = [] }: TeamBalanceBarProps) {
  const t = useTranslations("trainings");
  const { teamColorLabel } = useEntityLabels();
  const meta = TEAM_META.slice(0, teams.length);
  const levelOf = (id: string) => levels[id] ?? null;
  const balance = teamBalance(teams, levelOf);
  const names = meta.map((m) => teamColorLabel(m.key));
  const percents = balance.winProbabilities ? percentPair(balance.winProbabilities) : null;
  const strengthText = (s: number | null) => (s === null ? "–" : String(s));
  const tooFew = balance.strengths.some((s) => s === null);

  return (
    <Paper
      variant="outlined"
      component="section"
      aria-label={t("balanceTitle")}
      sx={{ p: 1.5, mb: 1.5, borderRadius: RADIUS.md }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 1,
          flexWrap: "wrap",
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: FONT_WEIGHT.semibold }}>
          {percents === null
            ? t("balanceTitle")
            : balance.favourite === null
              ? t("balanceEven")
              : t("balanceFavourite", { team: names[balance.favourite] })}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {t("balanceStrength", { values: balance.strengths.map(strengthText).join(" · ") })}
        </Typography>
      </Box>

      {percents && (
        <>
          <Box
            aria-hidden="true"
            sx={{
              display: "flex",
              height: 8,
              borderRadius: RADIUS.pill,
              overflow: "hidden",
              my: 1,
            }}
          >
            <Box sx={[{ width: `${percents[0]}%` }, bibDotSx(meta[0].key)]} />
            <Box sx={[{ width: `${percents[1]}%` }, bibDotSx(meta[1].key)]} />
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="caption">{`${names[0]} ${percents[0]}%`}</Typography>
            <Typography variant="caption">{`${names[1]} ${percents[1]}%`}</Typography>
          </Box>
        </>
      )}

      {percents === null && (
        <Typography variant="caption" component="p" sx={{ mt: 0.5 }}>
          {names.map((n, i) => `${n} ${strengthText(balance.strengths[i])}`).join(" · ")}
        </Typography>
      )}
      {tooFew && (
        <Typography variant="caption" component="p" color="text.secondary">
          {t("balanceTooFew", { min: MIN_TEAM_SIZE })}
        </Typography>
      )}

      {previews.length > 0 && (
        <Box aria-live="polite" sx={{ mt: 1 }}>
          {previews.map((p) => {
            // Solo la percentuale: la differenza di forza fra prima e dopo
            // direbbe il livello di chi si sposta.
            const b = teamBalance(p.teams, levelOf);
            if (!b.winProbabilities) return null;
            const [pa, pb] = percentPair(b.winProbabilities);
            const text = `${names[0]} ${pa}% · ${names[1]} ${pb}%`;
            return (
              <Typography key={p.targetIndex} variant="caption" component="p">
                {t("balancePreview", { team: names[p.targetIndex], result: text })}
              </Typography>
            );
          })}
        </Box>
      )}

      <Typography
        variant="caption"
        component="p"
        color="text.secondary"
        sx={{ mt: 1, display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 1.5 }}
      >
        {(["alta", "media", "bassa"] as const).map((band) => {
          const Icon = BAND_ICON[band];
          return (
            <Box component="span" key={band} sx={{ display: "inline-flex", alignItems: "center" }}>
              <Icon aria-hidden="true" fontSize="small" />
              {t(`bandShort.${band}`)}
            </Box>
          );
        })}
        <span>{t("bandLegendNone")}</span>
      </Typography>
      {balance.unrated > 0 && (
        <Typography variant="caption" component="p" color="text.secondary">
          {t("balanceUnrated", { count: balance.unrated })}
        </Typography>
      )}
    </Paper>
  );
}
