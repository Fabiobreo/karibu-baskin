"use client";

import { useState } from "react";
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
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import Link from "next/link";
import { ROLE_COLORS } from "@/lib/constants";
import { contrastText } from "@/lib/colorUtils";
import { useTranslations } from "next-intl";
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
  | "avgPoints";

const ROLE_OPTIONS = [1, 2, 3, 4, 5] as const;

export default function ClassificaInternaTable({ rows }: { rows: PlayerStatRow[] }) {
  const t = useTranslations("scorers");
  const tCommon = useTranslations("common");
  const { sportRoleLabel } = useEntityLabels();
  const COLS: { key: SortKey; label: string; title?: string }[] = [
    { key: "matches", label: t("colMatches"), title: t("titleMatches") },
    { key: "points", label: t("colPoints"), title: t("titlePoints") },
    { key: "avgPoints", label: t("colAvg"), title: t("titleAvg") },
    { key: "freeThrows", label: t("col1pt"), title: t("titleFreeThrows") },
    { key: "twoPointers", label: t("col2pt"), title: t("title2pt") },
    { key: "threePointers", label: t("col3pt"), title: t("title3pt") },
    { key: "fouls", label: t("colFouls"), title: t("colFouls") },
    { key: "illegalFouls", label: t("colIllegal"), title: t("titleIllegal") },
  ];
  const [sortBy, setSortBy] = useState<SortKey>("points");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [roleFilter, setRoleFilter] = useState<number | null>(null);
  const [nameSearch, setNameSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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
                  <SearchIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{ width: 200, "& .MuiOutlinedInput-root": { fontSize: "0.82rem" } }}
        />
        <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", alignItems: "center" }}>
          <Typography
            variant="caption"
            color="text.disabled"
            fontWeight={700}
            sx={{ mr: 0.5, textTransform: "uppercase", letterSpacing: "0.06em" }}
          >
            Ruolo:
          </Typography>
          <Chip
            label={t("all")}
            size="small"
            variant={roleFilter === null ? "filled" : "outlined"}
            color={roleFilter === null ? "primary" : "default"}
            onClick={() => handleRoleFilter(null)}
            sx={{ fontWeight: 600, cursor: "pointer", fontSize: "0.72rem" }}
          />
          {ROLE_OPTIONS.filter((r) => rolesInData.has(r)).map((r) => (
            <Chip
              key={r}
              label={`R${r}`}
              size="small"
              onClick={() => handleRoleFilter(r)}
              sx={{
                fontWeight: 700,
                cursor: "pointer",
                fontSize: "0.72rem",
                bgcolor: roleFilter === r ? ROLE_COLORS[r] : "transparent",
                color: roleFilter === r ? "#fff" : "text.primary",
                border: "1px solid",
                borderColor: roleFilter === r ? ROLE_COLORS[r] : "divider",
                "&:hover": {
                  bgcolor: roleFilter === r ? ROLE_COLORS[r] : "action.hover",
                },
              }}
            />
          ))}
          {filtered.length !== rows.length && (
            <Typography variant="caption" color="text.disabled" sx={{ ml: "auto" }}>
              {t("playerCount", { count: filtered.length })}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Desktop table */}
      <Box sx={{ display: { xs: "none", sm: "block" }, overflowX: "auto" }}>
        <Table size="small" sx={{ minWidth: 720 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: "action.hover" }}>
              <TableCell
                sx={{ width: 28, fontWeight: 700, fontSize: "0.75rem", color: "text.disabled" }}
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
                  sx={{ py: 4, color: "text.disabled" }}
                >
                  {t("noPlayersRole")}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((row, i) => (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ color: "text.disabled", fontWeight: 700, fontSize: "0.8rem" }}>
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
                            <Chip
                              label={sportRoleLabel(row.sportRole, row.sportRoleVariant ?? null)}
                              size="small"
                              sx={{
                                bgcolor: ROLE_COLORS[row.sportRole],
                                color: "#fff",
                                fontWeight: 600,
                                fontSize: "0.58rem",
                                height: 14,
                              }}
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
                                fontSize: "0.58rem",
                                height: 14,
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
                    const primaryLabel =
                      col.key === "avgPoints" ? primary.toFixed(1) : primary.toString();
                    return (
                      <TableCell
                        key={col.key}
                        align="center"
                        sx={{
                          fontWeight: isActive ? 700 : 400,
                          color: isActive ? "primary.main" : "text.primary",
                          fontSize: "0.82rem",
                          whiteSpace: "nowrap",
                          px: 1,
                        }}
                      >
                        {primaryLabel}
                        {loan > 0 && (
                          <Typography
                            component="span"
                            sx={{
                              ml: 0.5,
                              fontSize: "0.7rem",
                              color: "text.disabled",
                              fontWeight: 600,
                            }}
                            title="Stats fatte giocando in prestito per un'altra squadra"
                          >
                            (+{loan})
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
            <Typography variant="body2" color="text.disabled">
              Nessun giocatore con questo ruolo.
            </Typography>
          </Box>
        ) : (
          paginated.map((row, i) => {
            const totMatches = row.matches + row.loanMatches;
            const totPoints = row.points + row.loanPoints;
            const avg = totMatches > 0 ? totPoints / totMatches : 0;
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
                    color="text.disabled"
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
                        <Chip
                          label={sportRoleLabel(row.sportRole, row.sportRoleVariant ?? null)}
                          size="small"
                          sx={{
                            bgcolor: ROLE_COLORS[row.sportRole],
                            color: "common.white",
                            fontWeight: 600,
                            fontSize: "0.6rem",
                            height: 16,
                          }}
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
                            fontSize: "0.6rem",
                            height: 16,
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
                    { label: "Pt", value: totPoints, primary: true },
                    { label: "Media", value: avg.toFixed(1) },
                    { label: "G", value: totMatches },
                    { label: "2pt", value: row.twoPointers + row.loanTwoPointers },
                    { label: "3pt", value: row.threePointers + row.loanThreePointers },
                    { label: "TL", value: row.freeThrows + row.loanFreeThrows },
                    { label: "Falli", value: row.fouls + row.loanFouls },
                    {
                      label: "Ill.",
                      value: row.illegalFouls + row.loanIllegalFouls,
                    },
                  ].map(({ label, value, primary }) => (
                    <Box key={label} sx={{ textAlign: "center" }}>
                      <Typography
                        variant="caption"
                        color="text.disabled"
                        display="block"
                        sx={{ fontSize: "0.65rem", lineHeight: 1.2 }}
                      >
                        {label}
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight={primary ? 800 : 600}
                        color={primary ? "primary.main" : "text.primary"}
                        sx={{ fontSize: "0.82rem" }}
                      >
                        {value}
                      </Typography>
                    </Box>
                  ))}
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
        rowsPerPageOptions={[10, 25, 50]}
        labelRowsPerPage={t("rowsPerPage")}
        labelDisplayedRows={({ from, to, count }) => tCommon("paginationRows", { from, to, count })}
        sx={{ borderTop: "1px solid", borderColor: "divider" }}
      />
    </Paper>
  );
}
