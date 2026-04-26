"use client";

import { useState } from "react";
import {
  Box, Table, TableHead, TableRow, TableCell, TableBody,
  TablePagination, Chip, Typography,
} from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Link from "next/link";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export interface GironeMatchItem {
  id: string;
  slug: string | null;
  date: Date | string;
  result: string | null;
  ourScore: number | null;
  theirScore: number | null;
  isHome: boolean;
  opponent: { name: string };
}

const RESULT_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  WIN:  { label: "V", color: "#2E7D32", bg: "#E8F5E9" },
  DRAW: { label: "P", color: "#E65100", bg: "#FFF3E0" },
  LOSS: { label: "S", color: "#C62828", bg: "#FFEBEE" },
};

export default function GironeMatchList({ matches }: { matches: GironeMatchItem[] }) {
  const [page, setPage]               = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const paginated = matches.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  return (
    <>
      <Box sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "rgba(0,0,0,0.02)" }}>
              <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem" }}>Data</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem" }}>Avversario</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.72rem" }}>C/T</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.72rem" }}>Risultato</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.72rem" }}>Punteggio</TableCell>
              <TableCell sx={{ width: 24 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.map((m) => {
              const res  = m.result ? RESULT_LABEL[m.result] : null;
              const href = `/partite/${m.slug ?? m.id}`;
              return (
                <TableRow
                  key={m.id}
                  hover
                  component={Link}
                  href={href}
                  style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
                >
                  <TableCell sx={{ fontSize: "0.78rem", whiteSpace: "nowrap" }}>
                    {format(new Date(m.date), "d MMM yy", { locale: it })}
                  </TableCell>
                  <TableCell sx={{ fontSize: "0.78rem", fontWeight: 600 }}>
                    {m.opponent.name}
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="caption" color="text.secondary">
                      {m.isHome ? "C" : "T"}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {res && (
                      <Chip
                        label={res.label}
                        size="small"
                        sx={{ bgcolor: res.bg, color: res.color, fontWeight: 800, height: 20, fontSize: "0.7rem" }}
                      />
                    )}
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.82rem", fontVariantNumeric: "tabular-nums" }}>
                    {m.ourScore ?? "–"} – {m.theirScore ?? "–"}
                  </TableCell>
                  <TableCell sx={{ pr: 1.5 }}>
                    <ChevronRightIcon sx={{ fontSize: 16, color: "text.disabled", display: "block" }} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>
      {matches.length > 10 && (
        <TablePagination
          component="div"
          count={matches.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
          rowsPerPageOptions={[10, 25]}
          labelRowsPerPage="Righe:"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} di ${count}`}
          sx={{ borderTop: "1px solid rgba(0,0,0,0.07)" }}
        />
      )}
    </>
  );
}
