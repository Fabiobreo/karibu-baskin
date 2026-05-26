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

  const getMedal = (rank: number) =>
    rank === 0 ? "#F9A825" : rank === 1 ? "#9E9E9E" : rank === 2 ? "#A1662F" : null;

  const getPlayerHref = (row: ClassificaRow) =>
    row.kind === "user" && row.slug
      ? `/giocatori/${row.slug}?season=${encodeURIComponent(selectedSeason)}`
      : null;

  const pagination = (
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
      sx={{ borderTop: "1px solid", borderColor: "divider" }}
    />
  );

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2 }}>
      {/* Desktop table */}
      <TableContainer sx={{ display: { xs: "none", sm: "block" } }}>
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
              <TableCell align="center">Media</TableCell>
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
              const medal = getMedal(rank);
              const playerHref = getPlayerHref(row);

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
                      <EmojiEventsIcon
                        sx={{ fontSize: 18, color: medal, verticalAlign: "middle" }}
                      />
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
                              color: "common.white",
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
                  <TableCell align="center">
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
                          color="error.main"
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
      </TableContainer>

      {/* Mobile card view */}
      <Box sx={{ display: { xs: "block", sm: "none" } }}>
        {paginated.map((row, i) => {
          const rank = globalOffset + i;
          const medal = getMedal(rank);
          const playerHref = getPlayerHref(row);

          const stats = [
            { label: "G", value: row.matches, primary: false },
            { label: "Pt", value: row.points, primary: true },
            { label: "Media", value: row.avgPoints.toFixed(1), primary: false },
            { label: "2pt", value: row.twoPointers, primary: false },
            { label: "3pt", value: row.threePointers, primary: false },
            { label: "TL", value: row.freeThrows, primary: false },
            { label: "Falli", value: row.fouls, primary: false },
            ...(row.illegalFouls > 0
              ? [{ label: "Ill.", value: row.illegalFouls, primary: false, error: true }]
              : [{ label: "", value: "", primary: false, empty: true }]),
          ] as {
            label: string;
            value: string | number;
            primary: boolean;
            error?: boolean;
            empty?: boolean;
          }[];

          return (
            <Box
              key={row.id}
              onClick={playerHref ? () => router.push(playerHref) : undefined}
              sx={{
                px: 2,
                py: 1.5,
                borderBottom: "1px solid",
                borderColor: "divider",
                "&:last-child": { borderBottom: 0 },
                ...(rank < 3 ? { bgcolor: `${medal}08` } : {}),
                ...(playerHref
                  ? { cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }
                  : {}),
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
                <Box sx={{ width: 28, textAlign: "center", flexShrink: 0 }}>
                  {medal ? (
                    <EmojiEventsIcon sx={{ fontSize: 18, color: medal }} />
                  ) : (
                    <Typography variant="body2" color="text.disabled" fontWeight={600}>
                      {rank + 1}
                    </Typography>
                  )}
                </Box>
                <Avatar
                  src={row.image ?? undefined}
                  sx={{
                    width: 36,
                    height: 36,
                    fontSize: 14,
                    bgcolor: row.kind === "child" ? "grey.400" : undefined,
                  }}
                >
                  {row.name[0].toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
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
                        color: "common.white",
                        fontWeight: 700,
                      }}
                    />
                  )}
                </Box>
              </Box>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 0.5,
                  ml: "52px",
                }}
              >
                {stats.map(({ label, value, primary, error, empty }) =>
                  empty ? (
                    <Box key={label} />
                  ) : (
                    <Box key={label} sx={{ textAlign: "center" }}>
                      <Typography
                        variant="caption"
                        color="text.disabled"
                        sx={{ display: "block", fontSize: "0.6rem", textTransform: "uppercase" }}
                      >
                        {label}
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight={primary ? 800 : 600}
                        color={primary ? "primary.main" : error ? "error.main" : "text.primary"}
                      >
                        {value}
                      </Typography>
                    </Box>
                  )
                )}
              </Box>
            </Box>
          );
        })}
        {rows.length === 0 && (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <Typography variant="body2" color="text.disabled">
              Nessuna statistica disponibile.
            </Typography>
          </Box>
        )}
      </Box>

      {pagination}
    </Paper>
  );
}
