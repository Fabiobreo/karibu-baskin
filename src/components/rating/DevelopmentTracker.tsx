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
  TableSortLabel,
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
import RatingSparkline from "@/components/rating/RatingSparkline";
import { classifyTrend, TREND_META, type TrendLabel } from "@/lib/rating/ratingTrend";
import { ordinal } from "@/lib/rating/trueskill";
import { ROLES, sportRoleLabel } from "@/lib/constants";
import { FONT_WEIGHT } from "@/lib/fontWeight";

type SkillBucket = "alta" | "media" | "bassa";

// Le fasce dicono la posizione nella lista, non un giudizio sulla persona
// (UX-40): servono solo a filtrare, non compaiono mai accanto a un nome.
const SKILL_LABELS: Record<SkillBucket, string> = {
  alta: "Terzo più alto",
  media: "Terzo centrale",
  bassa: "Terzo più basso",
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

// Valenza del trend (UX-29): solo sul pallino finale della curva e sul chip,
// che ha gia' l'etichetta. La serie resta neutra. "Pochi dati" non e' una
// valenza: grigio.
const TREND_COLOR_TOKEN: Record<TrendLabel, string> = {
  crescita: "success.main",
  calo: "error.main",
  plateau: "text.secondary",
  altalenante: "warning.main",
  nuovo: "text.secondary",
};

/** Colore del chip di trend: valenza, o neutro per "Pochi dati". */
function trendChipColor(label: TrendLabel) {
  return TREND_META[label].color;
}

const TREND_ORDER: TrendLabel[] = ["crescita", "calo", "altalenante", "plateau", "nuovo"];

type SortColumn = "name" | "role" | "trend" | "games";

export default function DevelopmentTracker({ athletes }: { athletes: TrackedAthlete[] }) {
  const [search, setSearch] = useState("");
  const [trendFilter, setTrendFilter] = useState<TrendLabel | null>(null);
  const [roleFilter, setRoleFilter] = useState<number | null>(null);
  const [genderFilter, setGenderFilter] = useState<"MALE" | "FEMALE" | null>(null);
  const [skillFilter, setSkillFilter] = useState<SkillBucket | null>(null);
  const [sort, setSort] = useState<{ col: SortColumn; dir: "asc" | "desc" } | null>(null);

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

  const matching = rows.filter((r) => {
    if (trendFilter && r.trend.label !== trendFilter) return false;
    if (roleFilter !== null && r.sportRole !== roleFilter) return false;
    if (genderFilter && r.gender !== genderFilter) return false;
    if (skillFilter && skillBucketOf(r.ord) !== skillFilter) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Senza colonna scelta resta l'ordine di partenza (`rows`); a parità di
  // valore pure, perché l'ordinamento è stabile.
  const filtered = sort
    ? [...matching].sort((a, b) => {
        let cmp = 0;
        switch (sort.col) {
          case "name":
            cmp = a.name.localeCompare(b.name, "it");
            break;
          case "role":
            cmp = (a.sportRole ?? 99) - (b.sportRole ?? 99);
            break;
          case "trend":
            cmp = TREND_ORDER.indexOf(a.trend.label) - TREND_ORDER.indexOf(b.trend.label);
            break;
          case "games":
            cmp = a.games - b.games || a.officialGames - b.officialGames;
            break;
        }
        return sort.dir === "asc" ? cmp : -cmp;
      })
    : matching;

  // Tre tocchi sulla stessa intestazione: primo verso, verso opposto, ordine
  // di partenza (che non ha una colonna a cui tornare).
  function handleSort(col: SortColumn) {
    const first = col === "games" ? "desc" : "asc";
    setSort((prev) => {
      if (prev?.col !== col) return { col, dir: first };
      if (prev.dir === first) return { col, dir: first === "asc" ? "desc" : "asc" };
      return null;
    });
  }

  const sortLabel = (col: SortColumn, label: string) => (
    <TableSortLabel
      active={sort?.col === col}
      direction={sort?.col === col ? sort.dir : col === "games" ? "desc" : "asc"}
      onClick={() => handleSort(col)}
    >
      {label}
    </TableSortLabel>
  );

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

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="dev-skill-label">Livello</InputLabel>
          <Select
            labelId="dev-skill-label"
            label="Livello"
            value={skillFilter ?? "all"}
            onChange={(e) =>
              setSkillFilter(e.target.value === "all" ? null : (e.target.value as SkillBucket))
            }
          >
            <MenuItem value="all">Tutti</MenuItem>
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
            // Filtro selezionato = stato attivo standard (UX-29).
            color={trendFilter === t ? "primary" : "default"}
            variant={trendFilter === t ? "filled" : "outlined"}
            onClick={() => setTrendFilter(trendFilter === t ? null : t)}
          />
        ))}
      </Stack>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{sortLabel("name", "Giocatore")}</TableCell>
              <TableCell align="center" sx={{ display: { xs: "none", sm: "table-cell" } }}>
                {sortLabel("role", "Ruolo")}
              </TableCell>
              <TableCell align="center">Andamento</TableCell>
              <TableCell align="center">{sortLabel("trend", "Trend")}</TableCell>
              <TableCell align="center" sx={{ display: { xs: "none", md: "table-cell" } }}>
                {sortLabel("games", "Partitelle (+ ufficiali)")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={`${r.kind}-${r.id}`} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold}>
                    {r.name}
                  </Typography>
                </TableCell>
                <TableCell align="center" sx={{ display: { xs: "none", sm: "table-cell" } }}>
                  <Typography variant="body2" color="text.secondary">
                    {r.sportRole ? sportRoleLabel(r.sportRole, r.sportRoleVariant) : "—"}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <RatingSparkline
                    values={r.series}
                    endColorToken={TREND_COLOR_TOKEN[r.trend.label]}
                  />
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={TREND_META[r.trend.label].label}
                    size="small"
                    color={trendChipColor(r.trend.label)}
                    variant={
                      r.trend.label === "plateau" || r.trend.label === "nuovo"
                        ? "outlined"
                        : "filled"
                    }
                  />
                </TableCell>
                <TableCell align="center" sx={{ display: { xs: "none", md: "table-cell" } }}>
                  <Typography variant="body2" color="text.secondary">
                    {r.games}
                    {r.officialGames > 0 && (
                      <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
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
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: "text.secondary" }}>
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
