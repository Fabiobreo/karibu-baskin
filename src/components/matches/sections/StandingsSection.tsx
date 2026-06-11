"use client";

import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { StandingEntry } from "@/lib/standings";

/** Classifica compatta del girone con la nostra squadra evidenziata. */
export default function StandingsSection({
  standings,
  groupName,
}: {
  standings: StandingEntry[];
  groupName: string | null;
}) {
  const t = useTranslations("matches");
  const tStandings = useTranslations("standings");
  if (standings.length === 0) return null;

  return (
    <Box>
      <Box
        sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", mb: 1.5 }}
      >
        <Typography
          variant="caption"
          color="text.disabled"
          fontWeight={700}
          sx={{ textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.62rem" }}
        >
          {t("groupStandings")}
          {groupName ? ` — ${groupName}` : ""}
        </Typography>
        <Link href="/classifiche" style={{ textDecoration: "none" }}>
          <Typography
            variant="caption"
            sx={{
              color: "primary.main",
              fontWeight: 700,
              fontSize: "0.68rem",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            {t("seeAll")}
          </Typography>
        </Link>
      </Box>
      <Paper elevation={0} variant="outlined" sx={{ overflow: "hidden" }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "action.hover" }}>
              <TableCell
                sx={{
                  fontWeight: 700,
                  fontSize: "0.65rem",
                  color: "text.disabled",
                  py: 0.75,
                  width: 28,
                }}
              >
                #
              </TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: "0.65rem", py: 0.75 }}>
                {tStandings("colTeam")}
              </TableCell>
              {[
                tStandings("colPlayed"),
                tStandings("colWins"),
                tStandings("colDraws"),
                tStandings("colLosses"),
              ].map((h) => (
                <TableCell
                  key={h}
                  align="center"
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.65rem",
                    color: "text.disabled",
                    py: 0.75,
                    width: 28,
                  }}
                >
                  {h}
                </TableCell>
              ))}
              <TableCell
                align="center"
                sx={{
                  fontWeight: 700,
                  fontSize: "0.65rem",
                  color: "primary.main",
                  py: 0.75,
                  width: 36,
                }}
              >
                {tStandings("colPoints")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {standings.map((row, i) => (
              <TableRow
                key={row.id}
                sx={{
                  bgcolor: row.isOurs
                    ? (theme) => alpha(theme.palette.primary.main, 0.05)
                    : undefined,
                }}
              >
                <TableCell
                  sx={{ fontSize: "0.75rem", color: "text.disabled", fontWeight: 700, py: 1 }}
                >
                  {i + 1}
                </TableCell>
                <TableCell sx={{ fontSize: "0.8rem", fontWeight: row.isOurs ? 800 : 500, py: 1 }}>
                  {row.name}
                  {row.isOurs && (
                    <Box
                      component="span"
                      sx={{ ml: 0.5, fontSize: "0.55rem", color: "primary.main" }}
                    >
                      ●
                    </Box>
                  )}
                </TableCell>
                {[row.played, row.won, row.drawn, row.lost].map((v, j) => (
                  <TableCell
                    key={j}
                    align="center"
                    sx={{ fontSize: "0.75rem", color: "text.secondary", py: 1 }}
                  >
                    {v}
                  </TableCell>
                ))}
                <TableCell
                  align="center"
                  sx={{ fontSize: "0.82rem", fontWeight: 800, color: "primary.main", py: 1 }}
                >
                  {row.points}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
