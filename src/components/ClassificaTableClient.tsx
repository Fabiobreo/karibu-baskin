"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  TablePagination,
  Paper,
  Box,
  Typography,
  Avatar,
  Chip,
} from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { ROLE_COLORS, sportRoleLabel } from "@/lib/constants";

export interface ClassificaRow {
  id: string;
  name: string;
  image: string | null;
  sportRole: number | null;
  sportRoleVariant: string | null;
  slug: string | null;
  kind: "user" | "child";
  matches: number;
  points: number;
  twoPointers: number;
  threePointers: number;
  freeThrows: number;
  fouls: number;
  illegalFouls: number;
  shotsAttempted: number;
  avgPoints: number;
}

export default function ClassificaTableClient({
  rows,
  selectedSeason,
}: {
  rows: ClassificaRow[];
  selectedSeason: string;
}) {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const paginated = rows.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  const globalOffset = page * rowsPerPage;

  return (
    <TableContainer
      component={Paper}
      elevation={0}
      sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "auto" }}
    >
      <Table size="small" sx={{ minWidth: 720 }}>
        <TableHead>
          <TableRow
            sx={{
              "& th": {
                fontWeight: 700,
                fontSize: "0.72rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "text.secondary",
              },
            }}
          >
            <TableCell sx={{ width: 36, pl: 2 }}>#</TableCell>
            <TableCell>Giocatore</TableCell>
            <TableCell align="center">G</TableCell>
            <TableCell align="center" sx={{ color: "primary.main !important" }}>
              Pt
            </TableCell>
            <TableCell align="center" sx={{ display: { xs: "none", sm: "table-cell" } }}>
              Media
            </TableCell>
            <TableCell align="center" title="Canestri da 2 punti">
              2pt
            </TableCell>
            <TableCell align="center" title="Canestri da 3 punti">
              3pt
            </TableCell>
            <TableCell align="center" title="Tiri liberi">
              TL
            </TableCell>
            <TableCell align="center" sx={{ display: { xs: "none", md: "table-cell" } }}>
              Falli
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {paginated.map((row, i) => {
            const rank = globalOffset + i;
            const medal =
              rank === 0 ? "#F9A825" : rank === 1 ? "#9E9E9E" : rank === 2 ? "#A1662F" : null;
            const playerHref =
              row.kind === "user" && row.slug
                ? `/giocatori/${row.slug}?season=${encodeURIComponent(selectedSeason)}`
                : null;

            return (
              <TableRow
                key={row.id}
                hover
                onClick={playerHref ? () => router.push(playerHref) : undefined}
                sx={{
                  ...(rank < 3 ? { bgcolor: `${medal}08` } : {}),
                  ...(playerHref ? { cursor: "pointer" } : {}),
                }}
              >
                <TableCell sx={{ pl: 2 }}>
                  {medal ? (
                    <EmojiEventsIcon sx={{ fontSize: 18, color: medal, verticalAlign: "middle" }} />
                  ) : (
                    <Typography variant="body2" color="text.disabled" fontWeight={600}>
                      {rank + 1}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Avatar
                      src={row.image ?? undefined}
                      sx={{
                        width: 28,
                        height: 28,
                        fontSize: 12,
                        bgcolor: row.kind === "child" ? "grey.400" : undefined,
                      }}
                    >
                      {row.name[0].toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={700} noWrap>
                        {row.name}
                      </Typography>
                      {row.sportRole && (
                        <Chip
                          label={sportRoleLabel(row.sportRole, row.sportRoleVariant ?? null)}
                          size="small"
                          sx={{
                            fontSize: "0.62rem",
                            height: 16,
                            bgcolor: ROLE_COLORS[row.sportRole],
                            color: "#fff",
                            fontWeight: 700,
                          }}
                        />
                      )}
                    </Box>
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2" fontWeight={600}>
                    {row.matches}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2" fontWeight={800} color="primary">
                    {row.points}
                  </Typography>
                </TableCell>
                <TableCell align="center" sx={{ display: { xs: "none", sm: "table-cell" } }}>
                  <Typography variant="body2" color="text.secondary">
                    {row.avgPoints.toFixed(1)}
                  </Typography>
                </TableCell>
                <TableCell align="center">{row.twoPointers}</TableCell>
                <TableCell align="center">{row.threePointers}</TableCell>
                <TableCell align="center">{row.freeThrows}</TableCell>
                <TableCell align="center" sx={{ display: { xs: "none", md: "table-cell" } }}>
                  <Typography variant="body2" color="text.secondary">
                    {row.fouls}
                    {row.illegalFouls > 0 && (
                      <Typography
                        component="span"
                        variant="caption"
                        color="#C62828"
                        sx={{ ml: 0.5 }}
                        title="Falli illegali"
                      >
                        ({row.illegalFouls})
                      </Typography>
                    )}
                  </Typography>
                </TableCell>
              </TableRow>
            );
          })}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} align="center" sx={{ py: 6, color: "text.disabled" }}>
                Nessuna statistica disponibile.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <TablePagination
        component="div"
        count={rows.length}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value));
          setPage(0);
        }}
        rowsPerPageOptions={[10, 25, 50]}
        labelRowsPerPage="Righe:"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} di ${count}`}
        sx={{ borderTop: "1px solid rgba(0,0,0,0.07)" }}
      />
    </TableContainer>
  );
}
