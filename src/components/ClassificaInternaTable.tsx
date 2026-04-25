"use client";

import { useState } from "react";
import {
  Paper, Box, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  TableSortLabel, Avatar, Chip, TablePagination,
} from "@mui/material";
import Link from "next/link";
import { ROLE_COLORS, sportRoleLabel } from "@/lib/constants";

export interface PlayerStatRow {
  userId: string;
  name: string | null;
  image: string | null;
  slug: string | null;
  sportRole: number | null;
  sportRoleVariant: string | null;
  matches: number;
  points: number;
  baskets: number;
  assists: number;
  rebounds: number;
  fouls: number;
}

type SortKey = "matches" | "points" | "baskets" | "assists" | "rebounds" | "fouls" | "avgPoints";

const COLS: { key: SortKey; label: string; title?: string }[] = [
  { key: "matches",   label: "G",      title: "Partite giocate" },
  { key: "points",    label: "Pt",     title: "Punti totali" },
  { key: "baskets",   label: "Can",    title: "Canestri" },
  { key: "assists",   label: "Ast",    title: "Assist" },
  { key: "rebounds",  label: "Rim",    title: "Rimbalzi" },
  { key: "fouls",     label: "Fal",    title: "Falli" },
  { key: "avgPoints", label: "Med.Pt", title: "Media punti a partita" },
];

const ROLE_OPTIONS = [1, 2, 3, 4, 5] as const;

export default function ClassificaInternaTable({ rows }: { rows: PlayerStatRow[] }) {
  const [sortBy, setSortBy]           = useState<SortKey>("points");
  const [sortDir, setSortDir]         = useState<"asc" | "desc">("desc");
  const [roleFilter, setRoleFilter]   = useState<number | null>(null);
  const [page, setPage]               = useState(0);
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

  function getValue(row: PlayerStatRow, col: SortKey): number {
    if (col === "avgPoints") return row.matches > 0 ? row.points / row.matches : 0;
    return row[col];
  }

  const sorted = [...rows].sort((a, b) => {
    const aVal = getValue(a, sortBy);
    const bVal = getValue(b, sortBy);
    return sortDir === "asc" ? aVal - bVal : bVal - aVal;
  });

  const filtered = roleFilter !== null
    ? sorted.filter((r) => r.sportRole === roleFilter)
    : sorted;

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  if (rows.length === 0) return null;

  // Determine which roles actually appear in the data
  const rolesInData = new Set(rows.map((r) => r.sportRole).filter(Boolean));

  return (
    <Paper elevation={0} variant="outlined" sx={{ overflow: "hidden" }}>
      {/* Role filter chips */}
      <Box
        sx={{
          px: 2, py: 1.5,
          borderBottom: "1px solid rgba(0,0,0,0.07)",
          display: "flex", gap: 0.75, flexWrap: "wrap", alignItems: "center",
        }}
      >
        <Typography variant="caption" color="text.disabled" fontWeight={700} sx={{ mr: 0.5, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Ruolo:
        </Typography>
        <Chip
          label="Tutti"
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
              border: `1px solid ${roleFilter === r ? ROLE_COLORS[r] : "rgba(0,0,0,0.23)"}`,
              "&:hover": {
                bgcolor: roleFilter === r ? ROLE_COLORS[r] : "rgba(0,0,0,0.04)",
              },
            }}
          />
        ))}
        {filtered.length !== rows.length && (
          <Typography variant="caption" color="text.disabled" sx={{ ml: "auto" }}>
            {filtered.length} giocatori
          </Typography>
        )}
      </Box>

      {/* Table */}
      <Box sx={{ overflowX: "auto" }}>
        <Table size="small" sx={{ minWidth: 560 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: "rgba(0,0,0,0.03)" }}>
              <TableCell sx={{ width: 28, fontWeight: 700, fontSize: "0.75rem", color: "text.disabled" }}>#</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>Giocatore</TableCell>
              {COLS.map((col) => (
                <TableCell key={col.key} align="center" sx={{ fontWeight: 700, fontSize: "0.75rem", whiteSpace: "nowrap" }}>
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
                <TableCell colSpan={COLS.length + 2} align="center" sx={{ py: 4, color: "text.disabled" }}>
                  Nessun giocatore con questo ruolo.
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((row, i) => (
                <TableRow key={row.userId} hover>
                  <TableCell sx={{ color: "text.disabled", fontWeight: 700, fontSize: "0.8rem" }}>
                    {page * rowsPerPage + i + 1}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Avatar src={row.image ?? undefined} sx={{ width: 26, height: 26, fontSize: 11 }}>
                        {(row.name ?? "?")[0]}
                      </Avatar>
                      <Box>
                        {row.slug ? (
                          <Link href={`/giocatori/${row.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                            <Typography variant="body2" fontWeight={700} sx={{ "&:hover": { textDecoration: "underline" }, fontSize: "0.82rem" }}>
                              {row.name}
                            </Typography>
                          </Link>
                        ) : (
                          <Typography variant="body2" fontWeight={600} sx={{ fontSize: "0.82rem" }}>{row.name}</Typography>
                        )}
                        {row.sportRole && (
                          <Chip
                            label={sportRoleLabel(row.sportRole, row.sportRoleVariant ?? null)}
                            size="small"
                            sx={{ bgcolor: ROLE_COLORS[row.sportRole], color: "#fff", fontWeight: 600, fontSize: "0.58rem", height: 14, mt: 0.25 }}
                          />
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  {COLS.map((col) => {
                    const val = getValue(row, col.key);
                    const isActive = sortBy === col.key;
                    return (
                      <TableCell
                        key={col.key}
                        align="center"
                        sx={{
                          fontWeight: isActive ? 700 : 400,
                          color: isActive ? "primary.main" : "text.primary",
                          fontSize: "0.82rem",
                        }}
                      >
                        {col.key === "avgPoints" ? val.toFixed(1) : val}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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
        labelRowsPerPage="Righe:"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} di ${count}`}
        sx={{ borderTop: "1px solid rgba(0,0,0,0.07)" }}
      />
    </Paper>
  );
}
