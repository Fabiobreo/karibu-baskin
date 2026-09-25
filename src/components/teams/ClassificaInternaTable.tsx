"use client";

import { useState } from "react";
import { useRowsPerPage } from "@/hooks/useRowsPerPage";
import {
  Paper,
  Box,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableSortLabel,
  Avatar,
  Chip,
  TablePagination,
  InputAdornment,
  TextField,
  FormControlLabel,
  Switch,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import Link from "next/link";
import { roleColor } from "@/lib/constants";
import RoleBadge from "@/components/common/RoleBadge";
import { contrastText } from "@/lib/colorUtils";
import { useLocale, useTranslations } from "next-intl";
import { formatDecimal } from "@/lib/numberFormat";
import { formatAccuracy, shootingAccuracy } from "@/lib/matches/accuracy";
import { useEntityLabels } from "@/hooks/useEntityLabels";

export interface PlayerStatRow {
  /** Id del giocatore (User o Child). */
  id: string;
  kind: "user" | "child";
  name: string | null;
  image: string | null;
  slug: string | null;
  sportRole: number | null;
  sportRoleVariant: string | null;
  matches: number;
  points: number;
  twoPointers: number;
  threePointers: number;
  freeThrows: number;
  fouls: number;
  illegalFouls: number;
  shotsAttempted: number;
  /** Premi MVP ricevuti nella stagione (non splittato prestito/principale). */
  mvpCount: number;
  teams: { id: string; name: string; color: string | null }[];
  // Quote "in prestito": partite/punti/tiri fatti giocando per una squadra
  // diversa dalla propria. Sommate al valore principale danno il totale.
  loanMatches: number;
  loanPoints: number;
  loanTwoPointers: number;
  loanThreePointers: number;
  loanFreeThrows: number;
  loanFouls: number;
  loanIllegalFouls: number;
  loanShotsAttempted: number;
}

type SortKey =
  | "matches"
  | "points"
  | "twoPointers"
  | "threePointers"
  | "freeThrows"
  | "fouls"
  | "illegalFouls"
  | "shotsAttempted"
  | "avgPoints"
  | "accuracy"
  | "mvp";

const ROLE_OPTIONS = [1, 2, 3, 4, 5] as const;

export default function ClassificaInternaTable({ rows }: { rows: PlayerStatRow[] }) {
  const t = useTranslations("scorers");
  const tCommon = useTranslations("common");
  const tRoles = useTranslations("roles");
  const locale = useLocale();
  const { sportRoleLabel } = useEntityLabels();
  // `advanced: true` = colonna secondaria, nascosta finché non si accende
  // l'interruttore. Le dodici colonne tutte insieme non stavano nella pagina:
  // restano sempre visibili posizione, giocatore, giocate, punti e media.
  const ALL_COLS: { key: SortKey; label: string; title?: string; advanced?: boolean }[] = [
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
  const [sortBy, setSortBy] = useState<SortKey>("points");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [roleFilter, setRoleFilter] = useState<number | null>(null);
  const [nameSearch, setNameSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useRowsPerPage("internal-standings", [10, 25, 50, 100], 25);
  const [showAdvanced, setShowAdvanced] = useState(false);
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

  function handleSort(col: SortKey) {
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

  // Canestri e tiri di tutta la stagione, prestiti inclusi.
  function madeTotal(row: PlayerStatRow): number {
    return (
      row.freeThrows +
      row.twoPointers +
      row.threePointers +
      row.loanFreeThrows +
      row.loanTwoPointers +
      row.loanThreePointers
    );
  }

  function attemptedTotal(row: PlayerStatRow): number {
    return row.shotsAttempted + row.loanShotsAttempted;
  }

  // Mappa colonna ordinabile → coppia (primario, prestito) della riga.
  // Il totale si ottiene come primary + loan. Sort sempre sul totale.
  function getParts(row: PlayerStatRow, col: SortKey): { primary: number; loan: number } {
    switch (col) {
      case "matches":
        return { primary: row.matches, loan: row.loanMatches };
      case "points":
        return { primary: row.points, loan: row.loanPoints };
      case "twoPointers":
        return { primary: row.twoPointers, loan: row.loanTwoPointers };
      case "threePointers":
        return { primary: row.threePointers, loan: row.loanThreePointers };
      case "freeThrows":
        return { primary: row.freeThrows, loan: row.loanFreeThrows };
      case "fouls":
        return { primary: row.fouls, loan: row.loanFouls };
      case "illegalFouls":
        return { primary: row.illegalFouls, loan: row.loanIllegalFouls };
      case "shotsAttempted":
        return { primary: row.shotsAttempted, loan: row.loanShotsAttempted };
      case "avgPoints": {
        const totMatches = row.matches + row.loanMatches;
        const avg = totMatches > 0 ? (row.points + row.loanPoints) / totMatches : 0;
        // La media non ha senso splittata: la modelliamo come "tutta primaria"
        // così la cella non mostra (+X) per la media.
        return { primary: avg, loan: 0 };
      }
      case "accuracy": {
        // % realizzazione = canestri totali (1+2+3) / tiri tentati totali.
        // `shootingAccuracy` scarta i casi in cui i tentativi sono meno dei
        // canestri: lì il dato è incompleto e non c'è percentuale da ordinare.
        const pct = shootingAccuracy(madeTotal(row), attemptedTotal(row));
        return { primary: pct ?? 0, loan: 0 };
      }
      case "mvp":
        // MVP non è tracciato come prestito: sempre primario.
        return { primary: row.mvpCount, loan: 0 };
    }
  }

  function getTotal(row: PlayerStatRow, col: SortKey): number {
    const { primary, loan } = getParts(row, col);
    return primary + loan;
  }

  const sorted = [...rows].sort((a, b) => {
    const aVal = getTotal(a, sortBy);
    const bVal = getTotal(b, sortBy);
    return sortDir === "asc" ? aVal - bVal : bVal - aVal;
  });

  const filtered = sorted
    .filter((r) => roleFilter === null || r.sportRole === roleFilter)
    .filter(
      (r) =>
        nameSearch.trim() === "" ||
        (r.name ?? "").toLowerCase().includes(nameSearch.trim().toLowerCase())
    );

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  if (rows.length === 0) return null;

  // Qualche numero comprende un prestito? Allora serve la legenda sopra la
  // tabella: il vecchio `title` non si vedeva sui dispositivi touch.
  const hasLoans = rows.some((r) => COLS.some((c) => getParts(r, c.key).loan > 0));

  // Determine which roles actually appear in the data
  const rolesInData = new Set(rows.map((r) => r.sportRole).filter(Boolean));

  return (
    <Paper elevation={0} variant="outlined" sx={{ overflow: "hidden" }}>
      {/* Search + role filter */}
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
                  <SearchIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{ width: 200, "& .MuiOutlinedInput-root": { fontSize: "0.82rem" } }}
        />
        <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", alignItems: "center" }}>
          <Typography
            variant="caption"
            color="text.secondary"
            fontWeight={700}
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
            sx={{ fontWeight: 600, cursor: "pointer", fontSize: "0.75rem" }}
          />
          {ROLE_OPTIONS.filter((r) => rolesInData.has(r)).map((r) => (
            <Chip
              key={r}
              // "Ruolo 1", non "R1": la sigla era gergo (UX-17).
              label={tRoles("role", { n: r })}
              size="small"
              onClick={() => handleRoleFilter(r)}
              sx={{
                fontWeight: 700,
                cursor: "pointer",
                fontSize: "0.75rem",
                bgcolor: roleFilter === r ? roleColor(r) : "transparent",
                color: roleFilter === r ? contrastText(roleColor(r)) : "text.primary",
                border: "1px solid",
                borderColor: roleFilter === r ? roleColor(r) : "divider",
                "&:hover": {
                  bgcolor: roleFilter === r ? roleColor(r) : "action.hover",
                },
              }}
            />
          ))}
          {filtered.length !== rows.length && (
            <Typography variant="caption" color="text.secondary">
              {t("playerCount", { count: filtered.length })}
            </Typography>
          )}
        </Box>
        {/* Colonne secondarie a richiesta: con tutte e dodici la tabella
            sbordava dal contenitore e l'ultima colonna restava tagliata. */}
        <FormControlLabel
          sx={{ ml: { xs: 0, sm: "auto" }, mr: 0 }}
          control={
            <Switch
              size="small"
              checked={showAdvanced}
              onChange={(e) => handleToggleAdvanced(e.target.checked)}
            />
          }
          label={
            <Typography variant="caption" fontWeight={600} title={t("advancedStatsHint")}>
              {t("advancedStats")}
            </Typography>
          }
        />
      </Box>

      {hasLoans && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ px: 2, py: 1.25, borderBottom: "1px solid", borderColor: "divider" }}
        >
          {t("loanLegend")}
        </Typography>
      )}

      {/* Desktop table */}
      <Box sx={{ display: { xs: "none", sm: "block" }, overflowX: "auto" }}>
        <Table size="small" sx={{ minWidth: 720 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: "action.hover" }}>
              <TableCell
                sx={{ width: 28, fontWeight: 700, fontSize: "0.75rem", color: "text.secondary" }}
              >
                #
              </TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", minWidth: 200 }}>
                {t("colPlayer")}
              </TableCell>
              {COLS.map((col) => (
                <TableCell
                  key={col.key}
                  align="center"
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    whiteSpace: "nowrap",
                    px: 1,
                  }}
                >
                  <TableSortLabel
                    active={sortBy === col.key}
                    direction={sortBy === col.key ? sortDir : "desc"}
                    onClick={() => handleSort(col.key)}
                    title={col.title}
                    sx={{ "& .MuiTableSortLabel-icon": { fontSize: "0.75rem" } }}
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
                  <TableCell sx={{ color: "text.secondary", fontWeight: 700, fontSize: "0.8rem" }}>
                    {page * rowsPerPage + i + 1}
                  </TableCell>
                  <TableCell sx={{ minWidth: 200 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Avatar
                        src={row.image ?? undefined}
                        sx={{ width: 26, height: 26, fontSize: 11 }}
                      >
                        {(row.name ?? "?")[0]}
                      </Avatar>
                      <Box>
                        {(row.slug ?? row.id) ? (
                          <Link
                            href={`/giocatori/${row.slug ?? row.id}`}
                            style={{ textDecoration: "none", color: "inherit" }}
                          >
                            <Typography
                              variant="body2"
                              fontWeight={700}
                              sx={{
                                "&:hover": { textDecoration: "underline" },
                                fontSize: "0.82rem",
                              }}
                            >
                              {row.name}
                            </Typography>
                          </Link>
                        ) : (
                          <Typography variant="body2" fontWeight={600} sx={{ fontSize: "0.82rem" }}>
                            {row.name}
                          </Typography>
                        )}
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
                            <Chip
                              key={t.id}
                              label={t.name}
                              size="small"
                              sx={{
                                bgcolor: t.color ?? "primary.main",
                                color: contrastText(t.color),
                                fontWeight: 600,
                                fontSize: "0.75rem",
                                height: 20,
                              }}
                            />
                          ))}
                        </Box>
                      </Box>
                    </Box>
                  </TableCell>
                  {COLS.map((col) => {
                    const { primary, loan } = getParts(row, col.key);
                    const isActive = sortBy === col.key;
                    // In grande il totale, cioe' il numero su cui si ordina:
                    // prima si vedeva solo la parte propria e "74 (+13)" finiva
                    // sopra "76" (UX-06).
                    const totalLabel =
                      col.key === "avgPoints"
                        ? formatDecimal(primary, locale)
                        : col.key === "accuracy"
                          ? formatAccuracy(madeTotal(row), attemptedTotal(row))
                          : String(primary + loan);
                    return (
                      <TableCell
                        key={col.key}
                        align="center"
                        sx={{
                          fontWeight: isActive ? 700 : 400,
                          color: isActive ? "primary.onLight" : "text.primary",
                          fontSize: "0.82rem",
                          whiteSpace: "nowrap",
                          px: 1,
                          // Cifre a larghezza fissa: senza, le colonne
                          // numeriche non si incolonnano.
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {totalLabel}
                        {loan > 0 && (
                          <Typography
                            component="span"
                            display="block"
                            sx={{ fontSize: "0.75rem", color: "text.secondary", fontWeight: 600 }}
                          >
                            {t("loanDetail", { count: loan })}
                          </Typography>
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
          paginated.map((row, i) => {
            const totMatches = row.matches + row.loanMatches;
            const totPoints = row.points + row.loanPoints;
            const avg = totMatches > 0 ? totPoints / totMatches : 0;
            const accuracyLabel = formatAccuracy(madeTotal(row), attemptedTotal(row));
            const rank = page * rowsPerPage + i + 1;
            return (
              <Box
                key={row.id}
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
                    fontWeight={700}
                    color="text.secondary"
                    sx={{ minWidth: 24, textAlign: "right", flexShrink: 0 }}
                  >
                    {rank}
                  </Typography>
                  <Avatar src={row.image ?? undefined} sx={{ width: 32, height: 32, fontSize: 13 }}>
                    {(row.name ?? "?")[0]}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    {(row.slug ?? row.id) ? (
                      <Link
                        href={`/giocatori/${row.slug ?? row.id}`}
                        style={{ textDecoration: "none", color: "inherit" }}
                      >
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          noWrap
                          sx={{ "&:hover": { textDecoration: "underline" } }}
                        >
                          {row.name}
                        </Typography>
                      </Link>
                    ) : (
                      <Typography variant="body2" fontWeight={700} noWrap>
                        {row.name}
                      </Typography>
                    )}
                    <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 0.25 }}>
                      {row.sportRole && (
                        <RoleBadge role={row.sportRole} variant={row.sportRoleVariant ?? null} />
                      )}
                      {row.teams.map((t) => (
                        <Chip
                          key={t.id}
                          label={t.name}
                          size="small"
                          sx={{
                            bgcolor: t.color ?? "primary.main",
                            color: contrastText(t.color),
                            fontWeight: 600,
                            fontSize: "0.75rem",
                            height: 20,
                          }}
                        />
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
                  {[
                    {
                      label: t("colPoints"),
                      value: totPoints,
                      primary: true,
                      // Come nella tabella desktop: la legenda annuncia i punti in prestito (UX-24).
                      detail:
                        row.loanPoints > 0 ? t("loanDetail", { count: row.loanPoints }) : null,
                    },
                    { label: t("colAvg"), value: formatDecimal(avg, locale) },
                    { label: t("colAccuracy"), value: accuracyLabel },
                    { label: t("colMatches"), value: totMatches },
                    { label: t("col2pt"), value: row.twoPointers + row.loanTwoPointers },
                    { label: t("col3pt"), value: row.threePointers + row.loanThreePointers },
                    { label: t("colFouls"), value: row.fouls + row.loanFouls },
                    // Le stesse tre colonne secondarie della tabella desktop.
                    ...(showAdvanced
                      ? [
                          { label: t("col1pt"), value: row.freeThrows + row.loanFreeThrows },
                          { label: t("colMvp"), value: row.mvpCount },
                          {
                            label: t("colIllegal"),
                            value: row.illegalFouls + row.loanIllegalFouls,
                          },
                        ]
                      : []),
                  ].map(
                    ({
                      label,
                      value,
                      primary,
                      detail,
                    }: {
                      label: string;
                      value: string | number;
                      primary?: boolean;
                      detail?: string | null;
                    }) => (
                      <Box key={label} sx={{ textAlign: "center" }}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                          sx={{ fontSize: "0.75rem", lineHeight: 1.2 }}
                        >
                          {label}
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight={primary ? 800 : 600}
                          color="text.primary"
                          sx={{ fontSize: "0.82rem", fontVariantNumeric: "tabular-nums" }}
                        >
                          {value}
                        </Typography>
                        {detail && (
                          <Typography
                            variant="caption"
                            display="block"
                            sx={{ color: "text.secondary", fontWeight: 600, lineHeight: 1.2 }}
                          >
                            {detail}
                          </Typography>
                        )}
                      </Box>
                    )
                  )}
                </Box>
              </Box>
            );
          })
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
