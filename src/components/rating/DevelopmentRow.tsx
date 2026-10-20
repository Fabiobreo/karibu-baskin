"use client";

import { Box, ButtonBase, Collapse, Stack, TableCell, TableRow, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import SportsBasketballOutlinedIcon from "@mui/icons-material/SportsBasketballOutlined";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";
import RatingSparkline from "@/components/rating/RatingSparkline";
import {
  MIN_GAMES_FOR_CURVE,
  TREND_LABELS,
  dataLevel,
  type CurveStatus,
  type RecentTrend,
  type TrendLabel,
} from "@/lib/rating/ratingTrend";
import type { TrackedAthlete } from "@/lib/rating/developmentData";
import { sportRoleLabel } from "@/lib/constants";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { RADIUS } from "@/lib/radius";

export interface DevelopmentRowData extends TrackedAthlete {
  totalGames: number;
  status: CurveStatus;
  trend: RecentTrend | null;
}

interface DevelopmentRowProps {
  row: DevelopmentRowData;
  scale: { min: number; max: number };
  reference: number;
  /** Cosa è la riga di riferimento ("la media del ruolo 3"), per la legenda. */
  referenceLabel: string;
  open: boolean;
  onToggle: () => void;
}

// Valenza del trend (UX-29): solo sul pallino finale e sulla parola, che c'è
// sempre. Stabile è neutro.
const TREND_TOKEN: Record<TrendLabel, string> = {
  salita: "success.main",
  calo: "error.main",
  stabile: "text.secondary",
};

const TREND_ICON = {
  salita: TrendingUpIcon,
  calo: TrendingDownIcon,
  stabile: TrendingFlatIcon,
} as const;

const DAY = new Intl.DateTimeFormat("it-IT", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "Europe/Rome",
});
const DAY_YEAR = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "short",
  year: "2-digit",
  timeZone: "Europe/Rome",
});

export function formatDay(iso: string) {
  return DAY.format(new Date(iso));
}

const OUTCOME_LABEL = { vinta: "vinta", persa: "persa", pari: "pari" } as const;

/** Pallini pieni e vuoti: quante partite mancano perché la curva si legga. */
function GameDots({ games }: { games: number }) {
  return (
    <Stack direction="row" spacing={0.5} justifyContent="center" aria-hidden>
      {Array.from({ length: MIN_GAMES_FOR_CURVE }, (_, i) => (
        <Box
          key={i}
          sx={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            border: "1px solid",
            borderColor: "text.secondary",
            bgcolor: i < games ? "text.primary" : "transparent",
          }}
        />
      ))}
    </Stack>
  );
}

/** Tre tacche: quanti dati ci sono dietro la curva. */
function DataMeter({ games }: { games: number }) {
  const level = dataLevel(games);
  return (
    <Stack direction="row" spacing={0.25} aria-hidden>
      {[1, 2, 3].map((n) => (
        <Box
          key={n}
          sx={{
            width: 14,
            height: 5,
            borderRadius: RADIUS.sm,
            bgcolor: n <= level ? "text.primary" : "divider",
          }}
        />
      ))}
    </Stack>
  );
}

function TrendCell({ row }: { row: DevelopmentRowData }) {
  if (row.trend) {
    const Icon = TREND_ICON[row.trend.label];
    return (
      <Stack direction="row" spacing={0.75} alignItems="center">
        <Icon fontSize="small" sx={{ color: TREND_TOKEN[row.trend.label] }} />
        <Typography
          variant="body2"
          sx={{
            color: row.trend.label === "stabile" ? "text.primary" : TREND_TOKEN[row.trend.label],
            fontWeight: FONT_WEIGHT.semibold,
          }}
        >
          {TREND_LABELS[row.trend.label]}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
          ultime {row.trend.window}
        </Typography>
      </Stack>
    );
  }
  const missing = MIN_GAMES_FOR_CURVE - row.totalGames;
  return (
    <Typography variant="caption" color="text.secondary">
      {row.totalGames === 0
        ? "Nessuna partita registrata"
        : `Ancora ${missing} ${missing === 1 ? "partita" : "partite"} per la curva`}
    </Typography>
  );
}

function Detail({
  row,
  scale,
  reference,
  referenceLabel,
}: Omit<DevelopmentRowProps, "open" | "onToggle">) {
  const pts = row.points;
  const dates =
    pts.length >= 2
      ? [pts[0], pts[Math.floor((pts.length - 1) / 2)], pts[pts.length - 1]].map((p) =>
          DAY_YEAR.format(new Date(p.at))
        )
      : [];

  return (
    <Box sx={{ py: 2, px: { xs: 0, sm: 1 } }}>
      {pts.length >= 2 && (
        <>
          <RatingSparkline
            points={pts}
            scale={scale}
            reference={reference}
            endColorToken={row.trend ? TREND_TOKEN[row.trend.label] : undefined}
            markers
            fluid
            width={640}
            height={130}
          />
          <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
            {dates.map((d, i) => (
              <Typography key={i} variant="caption" color="text.secondary">
                {d}
              </Typography>
            ))}
          </Stack>
        </>
      )}

      {row.recentGames.length > 0 ? (
        <Stack spacing={0.75} sx={{ mt: 2 }}>
          <Typography variant="subtitle2">Ultime partite</Typography>
          {row.recentGames.map((g, i) => {
            const Icon =
              g.kind === "official" ? EmojiEventsOutlinedIcon : SportsBasketballOutlinedIcon;
            return (
              <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
                <Icon fontSize="small" sx={{ color: "text.secondary", mt: 0.25 }} />
                <Typography variant="body2">
                  <Box component="span" sx={{ color: "text.secondary" }}>
                    {formatDay(g.at)} ·{" "}
                  </Box>
                  {g.label}
                  {g.outcome && (
                    <Box component="span" sx={{ color: "text.secondary" }}>
                      {" "}
                      · {OUTCOME_LABEL[g.outcome]}
                      {g.score ? ` ${g.score}` : ""}
                    </Box>
                  )}
                </Typography>
              </Stack>
            );
          })}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mt: pts.length >= 2 ? 2 : 0 }}>
          Nessuna partita registrata.
        </Typography>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
        {row.games} {row.games === 1 ? "partitella" : "partitelle"}, {row.officialGames}{" "}
        {row.officialGames === 1 ? "partita ufficiale" : "partite ufficiali"}. La fascia grigia è
        l&apos;incertezza della stima: si stringe a ogni partita. La riga tratteggiata è{" "}
        {referenceLabel}; cerchio = partitella, quadrato = partita ufficiale.
      </Typography>
    </Box>
  );
}

export default function DevelopmentRow({
  row,
  scale,
  reference,
  referenceLabel,
  open,
  onToggle,
}: DevelopmentRowProps) {
  const detailId = `sviluppo-${row.kind}-${row.id}`;
  return (
    <>
      <TableRow
        hover
        onClick={onToggle}
        sx={{
          cursor: "pointer",
          "& > td": { borderBottom: open ? "none" : undefined },
          "& > td:first-of-type": { borderLeft: "3px solid transparent" },
          "&:hover > td:first-of-type": { borderLeftColor: "primary.main" },
          "&:hover .row-chevron": { color: "primary.main" },
        }}
      >
        <TableCell>
          <ButtonBase
            aria-expanded={open}
            // Il dettaglio esiste nel DOM solo da aperto (unmountOnExit).
            aria-controls={open ? detailId : undefined}
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            sx={{ borderRadius: RADIUS.sm, gap: 0.5, textAlign: "left" }}
          >
            <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold}>
              {row.name}
            </Typography>
            <ExpandMoreIcon
              className="row-chevron"
              fontSize="small"
              sx={{
                color: "text.secondary",
                transform: open ? "rotate(180deg)" : "none",
                transition: "transform 150ms",
              }}
            />
          </ButtonBase>
          {/* Su telefono il trend sta sotto il nome: la colonna non ci starebbe. */}
          <Box sx={{ display: { xs: "block", sm: "none" }, mt: 0.25 }}>
            <TrendCell row={row} />
          </Box>
        </TableCell>
        <TableCell align="center" sx={{ display: { xs: "none", sm: "table-cell" } }}>
          <Typography variant="body2" color="text.secondary">
            {row.sportRole ? sportRoleLabel(row.sportRole, row.sportRoleVariant) : "-"}
          </Typography>
        </TableCell>
        <TableCell align="center">
          {row.status === "leggibile" ? (
            <RatingSparkline
              points={row.points}
              scale={scale}
              reference={reference}
              endColorToken={row.trend ? TREND_TOKEN[row.trend.label] : undefined}
            />
          ) : (
            <GameDots games={row.totalGames} />
          )}
        </TableCell>
        <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
          <TrendCell row={row} />
        </TableCell>
        <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            title={`${row.games} partitelle, ${row.officialGames} ufficiali`}
          >
            <DataMeter games={row.totalGames} />
            <Typography variant="caption" color="text.secondary">
              {row.totalGames} {row.totalGames === 1 ? "partita" : "partite"}
            </Typography>
          </Stack>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={5} sx={{ py: 0, borderBottom: open ? undefined : "none" }}>
          <Collapse in={open} unmountOnExit id={detailId}>
            <Detail row={row} scale={scale} reference={reference} referenceLabel={referenceLabel} />
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}
