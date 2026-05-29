"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import RatingBadge from "@/components/RatingBadge";
import RatingSparkline from "@/components/RatingSparkline";
import { classifyTrend, TREND_META, type TrendLabel } from "@/lib/ratingTrend";
import { ordinal } from "@/lib/trueskill";
import { sportRoleLabel } from "@/lib/constants";

export interface TrackedAthlete {
  id: string;
  kind: "user" | "child";
  name: string;
  sportRole: number | null;
  sportRoleVariant: string | null;
  mu: number;
  sigma: number;
  /** μ in ordine cronologico (curva di sviluppo). */
  series: number[];
  /** Numero di partitelle che hanno contribuito al rating. */
  games: number;
}

const TREND_COLOR_TOKEN: Record<TrendLabel, string> = {
  crescita: "success.main",
  calo: "error.main",
  plateau: "text.secondary",
  altalenante: "warning.main",
  nuovo: "info.main",
};

const TREND_ORDER: TrendLabel[] = ["crescita", "calo", "altalenante", "plateau", "nuovo"];

export default function DevelopmentTracker({ athletes }: { athletes: TrackedAthlete[] }) {
  const [search, setSearch] = useState("");
  const [trendFilter, setTrendFilter] = useState<TrendLabel | null>(null);

  const rows = useMemo(() => {
    return athletes
      .map((a) => ({
        ...a,
        trend: classifyTrend(a.series),
        ord: ordinal({ mu: a.mu, sigma: a.sigma }),
      }))
      .sort((a, b) => b.ord - a.ord);
  }, [athletes]);

  const counts = useMemo(() => {
    const c: Record<TrendLabel, number> = {
      crescita: 0,
      calo: 0,
      altalenante: 0,
      plateau: 0,
      nuovo: 0,
    };
    for (const r of rows) c[r.trend.label]++;
    return c;
  }, [rows]);

  const filtered = rows.filter((r) => {
    if (trendFilter && r.trend.label !== trendFilter) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <Box>
      {/* Filtri */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        sx={{ mb: 2 }}
        alignItems="center"
      >
        <TextField
          size="small"
          placeholder="Cerca giocatore…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ minWidth: 220 }}
        />
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {TREND_ORDER.map((t) => (
            <Chip
              key={t}
              label={`${TREND_META[t].label} (${counts[t]})`}
              size="small"
              color={trendFilter === t ? TREND_META[t].color : "default"}
              variant={trendFilter === t ? "filled" : "outlined"}
              onClick={() => setTrendFilter(trendFilter === t ? null : t)}
            />
          ))}
        </Stack>
      </Stack>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Giocatore</TableCell>
              <TableCell align="center" sx={{ display: { xs: "none", sm: "table-cell" } }}>
                Ruolo
              </TableCell>
              <TableCell align="center">Skill</TableCell>
              <TableCell align="center">Andamento</TableCell>
              <TableCell align="center">Trend</TableCell>
              <TableCell align="center" sx={{ display: { xs: "none", md: "table-cell" } }}>
                Partite
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={`${r.kind}-${r.id}`} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {r.name}
                  </Typography>
                </TableCell>
                <TableCell align="center" sx={{ display: { xs: "none", sm: "table-cell" } }}>
                  <Typography variant="body2" color="text.secondary">
                    {r.sportRole ? sportRoleLabel(r.sportRole, r.sportRoleVariant) : "—"}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <RatingBadge mu={r.mu} sigma={r.sigma} />
                </TableCell>
                <TableCell align="center">
                  <RatingSparkline
                    values={r.series}
                    colorToken={TREND_COLOR_TOKEN[r.trend.label]}
                  />
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={TREND_META[r.trend.label].label}
                    size="small"
                    color={TREND_META[r.trend.label].color}
                    variant={r.trend.label === "plateau" ? "outlined" : "filled"}
                  />
                </TableCell>
                <TableCell align="center" sx={{ display: { xs: "none", md: "table-cell" } }}>
                  <Typography variant="body2" color="text.secondary">
                    {r.games}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  Nessun giocatore corrisponde ai filtri.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
