"use client";

import { useState } from "react";
import { useRowsPerPage } from "@/hooks/useRowsPerPage";
import {
  Paper,
  Box,
  Button,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableSortLabel,
  Chip,
  TablePagination,
  InputAdornment,
  TextField,
  FormControlLabel,
  Switch,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import Link from "next/link";
import RoleBadge from "@/components/common/RoleBadge";
import TeamChip from "@/components/teams/TeamChip";
import TeamAvatar from "@/components/teams/TeamAvatar";
import { useLocale, useTranslations } from "next-intl";
import { formatDecimal } from "@/lib/numberFormat";
import { formatAccuracy } from "@/lib/matches/accuracy";
import {
  attemptedTotal,
  averagePoints,
  columnTotal,
  filterScorers,
  filtersButtonLabel,
  madeTotal,
  matchesLoanNote,
  sortScorers,
  type PlayerStatRow,
  type ScorerSortKey,
} from "@/lib/matches/scorersTable";
import { TYPE_SCALE } from "@/lib/typeScale";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import {
  TOUCH_CHIP_ON_PHONE,
  TOUCH_FIELD_ON_PHONE,
  TOUCH_TARGET_ON_PHONE,
} from "@/lib/touchTarget";

// Il tipo vive con la logica pura; qui si riesporta per chi lo importava dal componente.
export type { PlayerStatRow };

const ROLE_OPTIONS = [1, 2, 3, 4, 5] as const;
const FILTERS_PANEL_ID = "scorers-filters";

export default function ClassificaInternaTable({ rows }: { rows: PlayerStatRow[] }) {
  const t = useTranslations("scorers");
  const tCommon = useTranslations("common");
  const tRoles = useTranslations("roles");
  const locale = useLocale();
  // `advanced: true` = colonna secondaria, nascosta finché non si accende
  // l'interruttore. Le dodici colonne tutte insieme non stavano nella pagina:
  // restano sempre visibili posizione, giocatore, giocate, punti e media.
  const ALL_COLS: { key: ScorerSortKey; label: string; title?: string; advanced?: boolean }[] = [
    { key: "matches", label: t("colMatches"), title: t("titleMatches") },
    { key: "points", label: t("colPoints"), title: t("titlePoints") },
    { key: "avgPoints", label: t("colAvg"), title: t("titleAvg") },
    { key: "accuracy", label: t("colAccuracy"), title: t("titleAccuracy") },
    { key: "freeThrows", label: t("col1pt"), title: t("titleFreeThrows"), advanced: true },
    { key: "twoPointers", label: t("col2pt"), title: t("title2pt") },
    { key: "threePointers", label: t("col3pt"), title: t("title3pt") },
    { key: "mvp", label: t("colMvp"), title: t("titleMvp"), advanced: true },
    { key: "fouls", label: t("colFouls"), title: t("colFoulsTitle") },
    { key: "illegalFouls", label: t("colIllegal"), title: t("titleIllegal"), advanced: true },
  ];
  const [sortBy, setSortBy] = useState<ScorerSortKey>("points");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [roleFilter, setRoleFilter] = useState<number | null>(null);
  const [nameSearch, setNameSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useRowsPerPage("internal-standings", [10, 25, 50, 100], 25);
  const [showAdvanced, setShowAdvanced] = useState(false);
  // Pannello dei filtri su telefono (UX-48): chiuso all'apertura, la ricerca
  // resta sempre fuori. Da `sm` in su il pannello non esiste: è la riga di sempre.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const COLS = ALL_COLS.filter((c) => showAdvanced || !c.advanced);

  // Se si spengono le avanzate mentre si ordina per una di quelle, l'ordinamento
  // resterebbe su una colonna invisibile: si torna ai punti.
  function handleToggleAdvanced(next: boolean) {
    setShowAdvanced(next);
    if (!next && ALL_COLS.some((c) => c.advanced && c.key === sortBy)) {
      setSortBy("points");
      setSortDir("desc");
    }
  }

  function handleSort(col: ScorerSortKey) {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("desc");
    }
    setPage(0);
  }

  function handleRoleFilter(role: number | null) {
    setRoleFilter(role);
    setPage(0);
  }

  function handleNameSearch(val: string) {
    setNameSearch(val);
    setPage(0);
  }

  const filtered = filterScorers(sortScorers(rows, sortBy, sortDir), roleFilter, nameSearch);
  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  if (rows.length === 0) return null;

  const loanNote = (row: PlayerStatRow) =>
    matchesLoanNote(row, (count) => t("loanDetail", { count }));

  // Determine which roles actually appear in the data
  const rolesInData = new Set(rows.map((r) => r.sportRole).filter(Boolean));

  return (
    <Paper elevation={0} variant="outlined" sx={{ overflow: "hidden" }}>
      {/* Ricerca + filtri. Su telefono una riga sola (ricerca e bottone
          "Filtri"), con ruolo e "Più colonne" nel pannello sotto; da `sm` il
          pannello diventa `display: contents` e i suoi pezzi tornano nella
          riga, come prima (UX-48). */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
          display: "flex",
          gap: 1.5,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <TextField
          size="small"
          placeholder={t("searchPlayer")}
          value={nameSearch}
          onChange={(e) => handleNameSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: TYPE_SCALE.md, color: "text.secondary" }} />
                </InputAdornment>
              ),
            },
            htmlInput: { "aria-label": t("searchPlayer") },
          }}
          sx={{
            width: { xs: "auto", sm: 200 },
            flex: { xs: "1 1 0", sm: "0 0 auto" },
            minWidth: 0,
            "& .MuiOutlinedInput-root": { fontSize: TYPE_SCALE.sm },
            ...TOUCH_FIELD_ON_PHONE,
          }}
        />
        <Button
          variant="outlined"
          startIcon={<FilterListIcon />}
          aria-expanded={filtersOpen}
          aria-controls={FILTERS_PANEL_ID}
          onClick={() => setFiltersOpen((o) => !o)}
          sx={{
            display: { xs: "inline-flex", sm: "none" },
            flexShrink: 0,
            whiteSpace: "nowrap",
            ...TOUCH_TARGET_ON_PHONE,
          }}
        >
          {filtersButtonLabel(
            t("filters"),
            roleFilter === null ? null : tRoles("role", { n: roleFilter })
          )}
        </Button>
        <Box
          id={FILTERS_PANEL_ID}
          sx={{
            display: { xs: filtersOpen ? "flex" : "none", sm: "contents" },
            width: "100%",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", alignItems: "center" }}>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={FONT_WEIGHT.semibold}
              sx={{ mr: 0.5, textTransform: "uppercase", letterSpacing: "0.06em" }}
            >
              {t("roleFilterLabel")}
            </Typography>
            <Chip
              label={t("all")}
              size="small"
              variant={roleFilter === null ? "filled" : "outlined"}
              color={roleFilter === null ? "primary" : "default"}
              onClick={() => handleRoleFilter(null)}
              sx={{ cursor: "pointer", fontSize: TYPE_SCALE.xs, ...TOUCH_CHIP_ON_PHONE }}
            />
            {ROLE_OPTIONS.filter((r) => rolesInData.has(r)).map((r) => (
              <Chip
                key={r}
                // "Ruolo 1", non "R1": la sigla era gergo (UX-17).
                label={tRoles("role", { n: r })}
                size="small"
                onClick={() => handleRoleFilter(r)}
                // Selezionato = stato attivo standard, come "Tutti" (UX-29).
                variant={roleFilter === r ? "filled" : "outlined"}
                color={roleFilter === r ? "primary" : "default"}
                sx={{ cursor: "pointer", fontSize: TYPE_SCALE.xs, ...TOUCH_CHIP_ON_PHONE }}
              />
            ))}
          </Box>
          {/* Colonne secondarie a richiesta: con tutte e dodici la tabella
              sbordava dal contenitore e l'ultima colonna restava tagliata. */}
          <FormControlLabel
            sx={{ ml: { xs: 0, sm: "auto" }, mr: 0, order: { sm: 2 } }}
            control={
              <Switch
                size="small"
                checked={showAdvanced}
                onChange={(e) => handleToggleAdvanced(e.target.checked)}
              />
            }
            label={
              <Typography
                variant="caption"
                fontWeight={FONT_WEIGHT.semibold}
                title={t("advancedStatsHint")}
              >
                {t("advancedStats")}
              </Typography>
            }
          />
        </Box>
        {/* Il conteggio resta fuori dal pannello: a pannello chiuso dice
            perché la lista è più corta. Da `sm` sta prima dell'interruttore. */}
        {filtered.length !== rows.length && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ width: { xs: "100%", sm: "auto" }, order: { sm: 1 } }}
          >
            {t("playerCount", { count: filtered.length })}
          </Typography>
        )}
      </Box>

      {/* Desktop table */}
      <Box sx={{ display: { xs: "none", sm: "block" }, overflowX: "auto" }}>
        <Table size="small" sx={{ minWidth: 720 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: "action.hover" }}>
              <TableCell
                sx={{
                  width: 28,
                  fontWeight: FONT_WEIGHT.semibold,
                  fontSize: TYPE_SCALE.xs,
                  color: "text.secondary",
                }}
              >
                #
              </TableCell>
              <TableCell
                sx={{ fontWeight: FONT_WEIGHT.semibold, fontSize: TYPE_SCALE.xs, minWidth: 200 }}
              >
                {t("colPlayer")}
              </TableCell>
              {COLS.map((col) => (
                <TableCell
                  key={col.key}
                  align="center"
                  sx={{
                    fontWeight: FONT_WEIGHT.semibold,
                    fontSize: TYPE_SCALE.xs,
                    whiteSpace: "nowrap",
                    px: 1,
                  }}
                >
                  <TableSortLabel
                    active={sortBy === col.key}
                    direction={sortBy === col.key ? sortDir : "desc"}
                    onClick={() => handleSort(col.key)}
                    title={col.title}
                    sx={{ "& .MuiTableSortLabel-icon": { fontSize: TYPE_SCALE.xs } }}
                  >
                    {col.label}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={COLS.length + 2}
                  align="center"
                  sx={{ py: 4, color: "text.secondary" }}
                >
                  {t("noPlayersRole")}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((row, i) => (
                <TableRow key={row.id} hover>
                  <TableCell
                    sx={{
                      color: "text.secondary",
                      fontWeight: FONT_WEIGHT.semibold,
                      fontSize: TYPE_SCALE.xs,
                    }}
                  >
                    {page * rowsPerPage + i + 1}
                  </TableCell>
                  <TableCell sx={{ minWidth: 200 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <TeamAvatar
                        name={row.name}
                        image={row.image}
                        color={row.teams[0]?.color}
                        size={26}
                        sx={{ fontSize: TYPE_SCALE.xs }}
                      />
                      <Box>
                        <PlayerName row={row} />
                        <Box
                          sx={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 0.5,
                            mt: 0.25,
                            alignItems: "center",
                          }}
                        >
                          {row.sportRole && (
                            <RoleBadge
                              role={row.sportRole}
                              variant={row.sportRoleVariant ?? null}
                            />
                          )}
                          {row.teams.map((t) => (
                            <TeamChip key={t.id} name={t.name} color={t.color} compact />
                          ))}
                        </Box>
                      </Box>
                    </Box>
                  </TableCell>
                  {COLS.map((col) => {
                    const isActive = sortBy === col.key;
                    const total = columnTotal(row, col.key);
                    // In grande il totale, cioe' il numero su cui si ordina
                    // (UX-06). Il prestito si dice una volta sola, nella
                    // colonna Giocate (UX-48).
                    const totalLabel =
                      col.key === "avgPoints"
                        ? formatDecimal(total, locale)
                        : col.key === "accuracy"
                          ? formatAccuracy(madeTotal(row), attemptedTotal(row))
                          : String(total);
                    const note = col.key === "matches" ? loanNote(row) : null;
                    return (
                      <TableCell
                        key={col.key}
                        align="center"
                        sx={{
                          // Colonna ordinata: in grassetto, in inchiostro. Lo
                          // stato attivo lo dice la freccia dell'intestazione
                          // (UX-49 A): niente arancio sulle celle.
                          fontWeight: isActive ? FONT_WEIGHT.semibold : FONT_WEIGHT.regular,
                          color: "text.primary",
                          fontSize: TYPE_SCALE.sm,
                          whiteSpace: "nowrap",
                          px: 1,
                          // Cifre a larghezza fissa: senza, le colonne
                          // numeriche non si incolonnano.
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {totalLabel}
                        {note && (
                          <Box
                            component="span"
                            sx={{
                              fontSize: TYPE_SCALE.xs,
                              color: "text.secondary",
                              fontWeight: FONT_WEIGHT.regular,
                            }}
                          >
                            {" · "}
                            {note}
                          </Box>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Box>

      {/* Mobile card view */}
      <Box sx={{ display: { xs: "block", sm: "none" } }}>
        {paginated.length === 0 ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              {t("noPlayersRole")}
            </Typography>
          </Box>
        ) : (
          paginated.map((row, i) => (
            <MobileScorerCard
              key={row.id}
              row={row}
              rank={page * rowsPerPage + i + 1}
              showAdvanced={showAdvanced}
              loanNote={loanNote(row)}
            />
          ))
        )}
      </Box>

      {/* Pagination */}
      <TablePagination
        component="div"
        count={filtered.length}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[10, 25, 50, 100]}
        labelRowsPerPage={t("rowsPerPage")}
        labelDisplayedRows={({ from, to, count }) => tCommon("paginationRows", { from, to, count })}
        sx={{ borderTop: "1px solid", borderColor: "divider" }}
      />
    </Paper>
  );
}

/** Nome del giocatore, con il link al profilo se ce l'ha. */
function PlayerName({ row, noWrap }: { row: PlayerStatRow; noWrap?: boolean }) {
  const name = (
    <Typography
      variant="body2"
      fontWeight={FONT_WEIGHT.semibold}
      noWrap={noWrap}
      sx={{ "&:hover": { textDecoration: "underline" }, fontSize: TYPE_SCALE.sm }}
    >
      {row.name}
    </Typography>
  );
  if (!(row.slug ?? row.id)) return name;
  return (
    <Link
      href={`/giocatori/${row.slug ?? row.id}`}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      {name}
    </Link>
  );
}

interface MobileScorerCardProps {
  row: PlayerStatRow;
  rank: number;
  showAdvanced: boolean;
  /** "2 in prestito", solo sotto Giocate (UX-48); null senza prestiti. */
  loanNote: string | null;
}

function MobileScorerCard({ row, rank, showAdvanced, loanNote }: MobileScorerCardProps) {
  const t = useTranslations("scorers");
  const locale = useLocale();
  const stats: { label: string; value: string | number; primary?: boolean; detail?: string }[] = [
    { label: t("colPoints"), value: columnTotal(row, "points"), primary: true },
    { label: t("colAvg"), value: formatDecimal(averagePoints(row), locale) },
    { label: t("colAccuracy"), value: formatAccuracy(madeTotal(row), attemptedTotal(row)) },
    {
      label: t("colMatches"),
      value: columnTotal(row, "matches"),
      detail: loanNote ?? undefined,
    },
    { label: t("col2pt"), value: columnTotal(row, "twoPointers") },
    { label: t("col3pt"), value: columnTotal(row, "threePointers") },
    { label: t("colFouls"), value: columnTotal(row, "fouls") },
    // Le stesse tre colonne secondarie della tabella desktop.
    ...(showAdvanced
      ? [
          { label: t("col1pt"), value: columnTotal(row, "freeThrows") },
          { label: t("colMvp"), value: row.mvpCount },
          { label: t("colIllegal"), value: columnTotal(row, "illegalFouls") },
        ]
      : []),
  ];

  return (
    <Box
      sx={{
        px: 2,
        py: 1.5,
        borderBottom: "1px solid",
        borderColor: "divider",
        "&:last-child": { borderBottom: 0 },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Typography
          variant="body2"
          fontWeight={FONT_WEIGHT.semibold}
          color="text.secondary"
          sx={{ minWidth: 24, textAlign: "right", flexShrink: 0 }}
        >
          {rank}
        </Typography>
        <TeamAvatar
          name={row.name}
          image={row.image}
          color={row.teams[0]?.color}
          size={32}
          sx={{ fontSize: TYPE_SCALE.sm }}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <PlayerName row={row} noWrap />
          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 0.25 }}>
            {row.sportRole && (
              <RoleBadge role={row.sportRole} variant={row.sportRoleVariant ?? null} />
            )}
            {row.teams.map((team) => (
              <TeamChip key={team.id} name={team.name} color={team.color} compact />
            ))}
          </Box>
        </Box>
      </Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 0.5,
          mt: 1,
          pl: "56px",
        }}
      >
        {stats.map(({ label, value, primary, detail }) => (
          <Box
            key={label}
            // La nota di prestito va a capo nella colonna stretta: la cella
            // occupa anche la riga sotto (che in quarta colonna è vuota), così
            // la card non si allunga.
            sx={{ textAlign: "center", gridRow: detail ? "span 2" : undefined }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              sx={{ fontSize: TYPE_SCALE.xs, lineHeight: 1.2 }}
            >
              {label}
            </Typography>
            <Typography
              variant="body2"
              fontWeight={primary ? FONT_WEIGHT.bold : FONT_WEIGHT.semibold}
              color="text.primary"
              sx={{ fontSize: TYPE_SCALE.sm, fontVariantNumeric: "tabular-nums" }}
            >
              {value}
            </Typography>
            {detail && (
              <Typography
                variant="caption"
                display="block"
                sx={{ color: "text.secondary", lineHeight: 1.2 }}
              >
                {detail}
              </Typography>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
