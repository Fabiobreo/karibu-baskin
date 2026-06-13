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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import RatingBadge from "@/components/rating/RatingBadge";
import RatingSparkline from "@/components/rating/RatingSparkline";
import { classifyTrend, TREND_META, type TrendLabel } from "@/lib/rating/ratingTrend";
import { ordinal } from "@/lib/rating/trueskill";
import { ROLES, sportRoleLabel } from "@/lib/constants";

type SkillBucket = "alta" | "media" | "bassa";

const SKILL_LABELS: Record<SkillBucket, string> = {
  alta: "Alta",
  media: "Media",
  bassa: "Bassa",
};

export interface TrackedAthlete {
  id: string;
  kind: "user" | "child";
  name: string;
  sportRole: number | null;
  sportRoleVariant: string | null;
  gender: "MALE" | "FEMALE" | null;
  mu: number;
  sigma: number;
  /** μ in ordine cronologico (curva di sviluppo). */
  series: number[];
  /** Numero di partitelle che hanno contribuito al rating. */
  games: number;
  /** Numero di partite ufficiali (segnale secondario W/L campionato). */
  officialGames: number;
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
  const [roleFilter, setRoleFilter] = useState<number | null>(null);
  const [genderFilter, setGenderFilter] = useState<"MALE" | "FEMALE" | null>(null);
  const [skillFilter, setSkillFilter] = useState<SkillBucket | null>(null);

  const rows = useMemo(() => {
    return athletes
      .map((a) => ({
        ...a,
        trend: classifyTrend(a.series),
        ord: ordinal({ mu: a.mu, sigma: a.sigma }),
      }))
      .sort((a, b) => b.ord - a.ord);
  }, [athletes]);

  // Soglie di skill a terzili sull'ordinal dell'intera popolazione: "Alta" =
  // terzo superiore, "Bassa" = terzo inferiore. Stabile rispetto agli altri filtri.
  const skillThresholds = useMemo(() => {
    const ords = rows.map((r) => r.ord).sort((a, b) => a - b);
    if (ords.length < 3) return null;
    return {
      lo: ords[Math.floor(ords.length / 3)],
      hi: ords[Math.floor((2 * ords.length) / 3)],
    };
  }, [rows]);

  function skillBucketOf(ord: number): SkillBucket {
    if (!skillThresholds) return "media";
    return ord >= skillThresholds.hi ? "alta" : ord < skillThresholds.lo ? "bassa" : "media";
  }

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
    if (roleFilter !== null && r.sportRole !== roleFilter) return false;
    if (genderFilter && r.gender !== genderFilter) return false;
    if (skillFilter && skillBucketOf(r.ord) !== skillFilter) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <Box>
      {/* Filtri */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        sx={{ mb: 1.5 }}
        alignItems={{ xs: "stretch", sm: "center" }}
        flexWrap="wrap"
        useFlexGap
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
          sx={{ minWidth: 220, flexGrow: { xs: 1, sm: 0 } }}
        />

        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel id="dev-role-label">Ruolo</InputLabel>
          <Select
            labelId="dev-role-label"
            label="Ruolo"
            value={roleFilter === null ? "all" : String(roleFilter)}
            onChange={(e) =>
              setRoleFilter(e.target.value === "all" ? null : Number(e.target.value))
            }
          >
            <MenuItem value="all">Tutti</MenuItem>
            {ROLES.map((r) => (
              <MenuItem key={r} value={String(r)}>
                {sportRoleLabel(r)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel id="dev-gender-label">Genere</InputLabel>
          <Select
            labelId="dev-gender-label"
            label="Genere"
            value={genderFilter ?? "all"}
            onChange={(e) =>
              setGenderFilter(
                e.target.value === "all" ? null : (e.target.value as "MALE" | "FEMALE")
              )
            }
          >
            <MenuItem value="all">Tutti</MenuItem>
            <MenuItem value="MALE">Maschile</MenuItem>
            <MenuItem value="FEMALE">Femminile</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel id="dev-skill-label">Skill</InputLabel>
          <Select
            labelId="dev-skill-label"
            label="Skill"
            value={skillFilter ?? "all"}
            onChange={(e) =>
              setSkillFilter(e.target.value === "all" ? null : (e.target.value as SkillBucket))
            }
          >
            <MenuItem value="all">Tutte</MenuItem>
            <MenuItem value="alta">{SKILL_LABELS.alta}</MenuItem>
            <MenuItem value="media">{SKILL_LABELS.media}</MenuItem>
            <MenuItem value="bassa">{SKILL_LABELS.bassa}</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {/* Filtro per trend */}
      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
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
                Partite (train. / uff.)
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
                    {r.officialGames > 0 && (
                      <Typography
                        component="span"
                        variant="caption"
                        color="primary.main"
                        sx={{ ml: 0.5 }}
                        title={`+ ${r.officialGames} partite ufficiali`}
                      >
                        +{r.officialGames} uff.
                      </Typography>
                    )}
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
