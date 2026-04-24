"use client";

import { useState } from "react";
import {
  Paper, Box, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  TableSortLabel, Avatar, Chip,
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
  { key: "matches", label: "G", title: "Partite giocate" },
  { key: "points", label: "Pt", title: "Punti totali" },
  { key: "baskets", label: "Can", title: "Canestri" },
  { key: "assists", label: "Ast", title: "Assist" },
  { key: "rebounds", label: "Rim", title: "Rimbalzi" },
  { key: "fouls", label: "Fal", title: "Falli" },
  { key: "avgPoints", label: "Med.Pt", title: "Media punti a partita" },
];

export default function ClassificaInternaTable({ rows }: { rows: PlayerStatRow[] }) {
  const [sortBy, setSortBy] = useState<SortKey>("points");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function handleSort(col: SortKey) {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("desc");
    }
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

  if (sorted.length === 0) return null;

  return (
    <Paper elevation={0} variant="outlined" sx={{ overflow: "hidden" }}>
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
            {sorted.map((row, i) => (
              <TableRow key={row.userId} hover>
                <TableCell sx={{ color: "text.disabled", fontWeight: 700, fontSize: "0.8rem" }}>
                  {i + 1}
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
            ))}
          </TableBody>
        </Table>
      </Box>
    </Paper>
  );
}
