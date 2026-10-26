"use client";

import { Fragment, useMemo, useState } from "react";
import {
  Box,
  Paper,
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
import DevelopmentRow, {
  formatDay,
  type DevelopmentRowData,
} from "@/components/rating/DevelopmentRow";
import {
  RECENT_WINDOW,
  TREND_LABELS,
  curveScale,
  curveStatus,
  isGame,
  recentTrend,
  type TrendLabel,
} from "@/lib/rating/ratingTrend";
import type { TrackedAthlete, TrackerSummary } from "@/lib/rating/developmentData";
import { ordinal, TRUESKILL } from "@/lib/rating/trueskill";
import { levelBand, type BandThresholds, type LevelBand } from "@/lib/rating/levelBands";
import RoleBadge from "@/components/common/RoleBadge";
import {
  ROLE_GROUPS,
  ROLE_GROUP_LABELS,
  ROLE_GROUP_MEAN_LABELS,
  ROLE_GROUP_ROLES,
  groupReference,
  roleGroupOf,
  tercileThresholds,
  type RoleGroup,
} from "@/lib/rating/roleGroups";
import { RADIUS } from "@/lib/radius";

type SkillBucket = LevelBand;

// Le fasce dicono la posizione nella lista, non un giudizio sulla persona
// (UX-40): servono solo a filtrare, non compaiono mai accanto a un nome.
const SKILL_LABELS: Record<SkillBucket, string> = {
  alta: "Terzo più alto",
  media: "Terzo centrale",
  bassa: "Terzo più basso",
};

type View = "tutti" | "leggibile" | "salita" | "calo" | "formazione" | "senza";

const VIEW_LABELS: Record<View, string> = {
  tutti: "Tutti",
  leggibile: "Curva leggibile",
  salita: TREND_LABELS.salita,
  calo: TREND_LABELS.calo,
  formazione: "In formazione",
  senza: "Senza dati",
};

const VIEWS: View[] = ["leggibile", "salita", "calo", "formazione", "senza", "tutti"];

function inView(row: DevelopmentRowData, view: View) {
  switch (view) {
    case "tutti":
      return true;
    case "salita":
    case "calo":
      return row.trend?.label === view;
    default:
      return row.status === view;
  }
}

const TREND_ORDER: (TrendLabel | null)[] = ["salita", "calo", "stabile", null];

type SortColumn = "name" | "trend" | "games";

interface DevelopmentTrackerProps {
  athletes: TrackedAthlete[];
  summary: TrackerSummary;
}

export default function DevelopmentTracker({ athletes, summary }: DevelopmentTrackerProps) {
  const rows = useMemo<DevelopmentRowData[]>(
    () =>
      athletes
        .map((a) => {
          const totalGames = a.points.filter(isGame).length;
          return {
            ...a,
            totalGames,
            status: curveStatus(totalGames),
            trend: recentTrend(a.points, TRUESKILL.MU),
          };
        })
        // Prima chi ha più dati: la curva di chi ha giocato tanto dice di più.
        .sort((a, b) => b.totalGames - a.totalGames || a.name.localeCompare(b.name, "it")),
    [athletes]
  );

  const scale = useMemo(() => curveScale(rows.map((r) => r.points)) ?? { min: 0, max: 50 }, [rows]);
  // Per ogni gruppo di ruolo: media di riferimento e terzili. Contano solo le
  // curve leggibili: chi non ha mai giocato resta al livello di partenza e
  // tirerebbe la media verso quel valore. Calcolati sull'intera rosa, quindi
  // stabili rispetto ai filtri.
  const groupStats = useMemo(() => {
    const measured = rows.filter((r) => r.status === "leggibile");
    const squad = measured.length > 0 ? measured : rows;
    const squadMean = squad.reduce((s, r) => s + r.mu, 0) / Math.max(1, squad.length);
    return Object.fromEntries(
      ROLE_GROUPS.map((g) => {
        const inGroup = rows.filter((r) => roleGroupOf(r.sportRole) === g);
        return [
          g,
          {
            reference: groupReference(
              inGroup.filter((r) => r.status === "leggibile").map((r) => r.mu),
              squadMean
            ),
            terciles: tercileThresholds(inGroup.map((r) => ordinal(r))),
          },
        ];
      })
    ) as Record<
      RoleGroup,
      {
        reference: { value: number; own: boolean };
        terciles: { lo: number; hi: number } | null;
      }
    >;
  }, [rows]);

  const counts = useMemo(() => {
    const c = Object.fromEntries(VIEWS.map((v) => [v, 0])) as Record<View, number>;
    for (const r of rows) for (const v of VIEWS) if (inView(r, v)) c[v]++;
    return c;
  }, [rows]);

  const [view, setView] = useState<View>(counts.leggibile > 0 ? "leggibile" : "tutti");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleGroup | null>(null);
  const [genderFilter, setGenderFilter] = useState<"MALE" | "FEMALE" | null>(null);
  const [skillFilter, setSkillFilter] = useState<SkillBucket | null>(null);
  const [sort, setSort] = useState<{ col: SortColumn; dir: "asc" | "desc" } | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);

  // Terzi dentro il gruppo di ruolo: sulla rosa intera li dominerebbero i ruoli alti.
  // Stessa regola delle fasce nelle squadre degli allenamenti (`levelBand`, UX-54).
  function skillBucketOf(r: DevelopmentRowData): SkillBucket {
    const thresholds = Object.fromEntries(
      ROLE_GROUPS.map((g) => [g, groupStats[g].terciles])
    ) as BandThresholds;
    return levelBand(r.sportRole, r, thresholds);
  }

  const matching = rows.filter((r) => {
    if (!inView(r, view)) return false;
    if (roleFilter !== null && roleGroupOf(r.sportRole) !== roleFilter) return false;
    if (genderFilter && r.gender !== genderFilter) return false;
    if (skillFilter && skillBucketOf(r) !== skillFilter) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Senza colonna scelta resta l'ordine di partenza (più dati prima).
  const filtered = sort
    ? [...matching].sort((a, b) => {
        let cmp = 0;
        switch (sort.col) {
          case "name":
            cmp = a.name.localeCompare(b.name, "it");
            break;
          case "trend":
            cmp =
              TREND_ORDER.indexOf(a.trend?.label ?? null) -
              TREND_ORDER.indexOf(b.trend?.label ?? null);
            break;
          case "games":
            cmp = a.totalGames - b.totalGames;
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

  const readable = counts.leggibile;
  const forming = counts.formazione;
  const pct = (n: number) => `${(n / Math.max(1, rows.length)) * 100}%`;

  return (
    <Box>
      {/* Riepilogo: quanti dati ci sono, così la pagina si vede riempire. */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" },
          gap: 1.5,
          mb: 3,
        }}
      >
        <SummaryTile
          label="Partitelle registrate"
          value={String(summary.seasonGames)}
          caption={
            summary.lastSessionAt
              ? `In ${summary.seasonSessions} ${summary.seasonSessions === 1 ? "allenamento" : "allenamenti"} di questa stagione, l'ultima ${formatDay(summary.lastSessionAt)}`
              : "Nessuna in questa stagione"
          }
        />
        <SummaryTile
          label="Curva leggibile"
          value={`${readable} di ${rows.length}`}
          caption={`${readable} leggibili · ${forming} in formazione · ${counts.senza} senza dati`}
        >
          <Box
            aria-hidden
            sx={{
              display: "flex",
              height: 6,
              mt: 1,
              borderRadius: RADIUS.pill,
              overflow: "hidden",
              bgcolor: "divider",
            }}
          >
            <Box sx={{ width: pct(readable), bgcolor: "text.primary" }} />
            <Box sx={{ width: pct(forming), bgcolor: "text.secondary" }} />
          </Box>
        </SummaryTile>
        <SummaryTile
          label="Da guardare"
          value={String(counts.calo)}
          caption={`In calo nelle ultime ${RECENT_WINDOW} partite`}
        />
      </Box>

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
            value={roleFilter ?? "all"}
            onChange={(e) =>
              setRoleFilter(e.target.value === "all" ? null : (e.target.value as RoleGroup))
            }
          >
            <MenuItem value="all">Tutti</MenuItem>
            {ROLE_GROUPS.map((g) => (
              <MenuItem key={g} value={g}>
                {ROLE_GROUP_LABELS[g]}
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

      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        {VIEWS.map((v) => (
          <Chip
            key={v}
            label={`${VIEW_LABELS[v]} (${counts[v]})`}
            size="small"
            // Filtro selezionato = stato attivo standard (UX-29).
            color={view === v ? "primary" : "default"}
            variant={view === v ? "filled" : "outlined"}
            onClick={() => setView(v)}
          />
        ))}
      </Stack>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{sortLabel("name", "Giocatore")}</TableCell>
              <TableCell align="center" sx={{ display: { xs: "none", sm: "table-cell" } }}>
                Ruolo
              </TableCell>
              <TableCell align="center">Andamento</TableCell>
              <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                {sortLabel("trend", "Ultime partite")}
              </TableCell>
              <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                {sortLabel("games", "Dati")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ROLE_GROUPS.map((g) => {
              const groupRows = filtered.filter((r) => roleGroupOf(r.sportRole) === g);
              if (groupRows.length === 0) return null;
              const { reference } = groupStats[g];
              return (
                <Fragment key={g}>
                  <RoleGroupHeader
                    group={g}
                    count={groupRows.length}
                    ownReference={reference.own}
                  />
                  {groupRows.map((r) => {
                    const key = `${r.kind}-${r.id}`;
                    return (
                      <DevelopmentRow
                        key={key}
                        row={r}
                        scale={scale}
                        reference={reference.value}
                        referenceLabel={
                          reference.own ? ROLE_GROUP_MEAN_LABELS[g] : "la media della rosa"
                        }
                        open={openKey === key}
                        onToggle={() => setOpenKey(openKey === key ? null : key)}
                      />
                    );
                  })}
                </Fragment>
              );
            })}
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

/** Intestazione di sezione: i giocatori si confrontano dentro il gruppo di ruolo. */
function RoleGroupHeader({
  group,
  count,
  ownReference,
}: {
  group: RoleGroup;
  count: number;
  ownReference: boolean;
}) {
  return (
    <TableRow>
      <TableCell colSpan={5} sx={{ bgcolor: "action.hover", py: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          {ROLE_GROUP_ROLES[group].map((r) => (
            <RoleBadge key={r} role={r} />
          ))}
          <Typography variant="subtitle2" component="h3">
            {ROLE_GROUP_LABELS[group]}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {count} {count === 1 ? "giocatore" : "giocatori"}
            {!ownReference && " · poche curve, riferimento sulla media della rosa"}
          </Typography>
        </Stack>
      </TableCell>
    </TableRow>
  );
}

function SummaryTile({
  label,
  value,
  caption,
  children,
}: {
  label: string;
  value: string;
  caption: string;
  children?: React.ReactNode;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
        {label}
      </Typography>
      <Typography variant="h5" component="p" sx={{ fontVariantNumeric: "tabular-nums" }}>
        {value}
      </Typography>
      {children}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", mt: 0.75, lineHeight: 1.4 }}
      >
        {caption}
      </Typography>
    </Paper>
  );
}
