"use client";

import { useState } from "react";
import {
  Box, Table, TableHead, TableRow, TableCell, TableBody,
  TablePagination, Paper, Avatar, Chip, Typography,
} from "@mui/material";
import Link from "next/link";
import { ROLE_COLORS, sportRoleLabel } from "@/lib/constants";

export interface MatchStatRow {
  id: string;
  points: number;
  baskets: number;
  assists: number;
  rebounds: number;
  fouls: number;
  notes?: string | null;
  user: { id: string; name: string | null; image: string | null; slug: string | null; sportRole: number | null; sportRoleVariant: string | null } | null;
  child: { id: string; name: string; sportRole: number | null; sportRoleVariant: string | null } | null;
}

export default function MatchStatsTable({ stats }: { stats: MatchStatRow[] }) {
  const [page, setPage]               = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const paginated = stats.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  const globalOffset = page * rowsPerPage;

  return (
    <Paper elevation={0} variant="outlined" sx={{ overflow: "hidden" }}>
      <Box sx={{ overflowX: "auto" }}>
        <Table size="small" sx={{ minWidth: 480 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: "rgba(0,0,0,0.03)" }}>
              <TableCell sx={{ width: 28, fontWeight: 700, fontSize: "0.72rem", color: "text.disabled" }}>#</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem" }}>Giocatore</TableCell>
              {(["Pt", "Can", "Ast", "Rim", "Fal"] as const).map((h) => (
                <TableCell key={h} align="center" sx={{ fontWeight: 700, fontSize: "0.72rem" }}
                  title={h === "Pt" ? "Punti" : h === "Can" ? "Canestri" : h === "Ast" ? "Assist" : h === "Rim" ? "Rimbalzi" : "Falli"}
                >
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.map((stat, i) => {
              const athlete = stat.user ?? stat.child;
              const name    = athlete?.name ?? "—";
              const role    = athlete?.sportRole ?? null;
              const variant = athlete?.sportRoleVariant ?? null;
              const slug    = stat.user?.slug ?? null;
              const image   = stat.user?.image ?? null;

              return (
                <TableRow key={stat.id} hover>
                  <TableCell sx={{ color: "text.disabled", fontWeight: 700, fontSize: "0.78rem" }}>
                    {globalOffset + i + 1}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Avatar src={image ?? undefined} sx={{ width: 24, height: 24, fontSize: 10 }}>
                        {name[0]}
                      </Avatar>
                      <Box>
                        {slug ? (
                          <Link href={`/giocatori/${slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                            <Typography variant="body2" fontWeight={700} sx={{ fontSize: "0.8rem", "&:hover": { textDecoration: "underline" } }}>
                              {name}
                            </Typography>
                          </Link>
                        ) : (
                          <Typography variant="body2" fontWeight={600} sx={{ fontSize: "0.8rem" }}>{name}</Typography>
                        )}
                        {role && (
                          <Chip
                            label={sportRoleLabel(role, variant)}
                            size="small"
                            sx={{ bgcolor: ROLE_COLORS[role], color: "#fff", fontWeight: 600, fontSize: "0.55rem", height: 13, mt: 0.2 }}
                          />
                        )}
                        {stat.notes && (
                          <Typography variant="caption" color="text.disabled" sx={{ display: "block", mt: 0.3, fontStyle: "italic", fontSize: "0.7rem", maxWidth: 200, lineHeight: 1.3 }}>
                            {stat.notes}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800, color: "primary.main", fontSize: "0.85rem" }}>{stat.points}</TableCell>
                  <TableCell align="center" sx={{ fontSize: "0.82rem" }}>{stat.baskets}</TableCell>
                  <TableCell align="center" sx={{ fontSize: "0.82rem" }}>{stat.assists}</TableCell>
                  <TableCell align="center" sx={{ fontSize: "0.82rem" }}>{stat.rebounds}</TableCell>
                  <TableCell align="center" sx={{ fontSize: "0.82rem", color: stat.fouls >= 4 ? "#C62828" : undefined, fontWeight: stat.fouls >= 4 ? 700 : 400 }}>
                    {stat.fouls}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>
      <TablePagination
        component="div"
        count={stats.length}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
        rowsPerPageOptions={[10, 25, 50]}
        labelRowsPerPage="Righe:"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} di ${count}`}
        sx={{ borderTop: "1px solid rgba(0,0,0,0.07)" }}
      />
    </Paper>
  );
}
