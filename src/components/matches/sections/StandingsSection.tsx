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
import StatAbbr from "@/components/teams/StatAbbr";
import { useTranslations } from "next-intl";
import type { StandingEntry } from "@/lib/season/standings";

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
          {groupName ? ` · ${groupName}` : ""}
        </Typography>
        <Link href="/classifiche" style={{ textDecoration: "none" }}>
          <Typography
            variant="caption"
            sx={{
              color: "primary.onLight",
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
              {(["colPlayed", "colWins", "colDraws", "colLosses"] as const).map((key) => (
                <TableCell
                  key={key}
                  align="center"
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.65rem",
                    color: "text.disabled",
                    py: 0.75,
                    width: 28,
                  }}
                >
                  <StatAbbr short={tStandings(key)} full={tStandings(`${key}Full`)} />
                </TableCell>
              ))}
              <TableCell
                align="center"
                sx={{
                  fontWeight: 700,
                  fontSize: "0.65rem",
                  color: "primary.onLight",
                  py: 0.75,
                  width: 36,
                }}
              >
                <StatAbbr short={tStandings("colPoints")} full={tStandings("colPointsFull")} />
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
                    sx={{
                      fontSize: "0.75rem",
                      color: "text.secondary",
                      py: 1,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {v}
                  </TableCell>
                ))}
                <TableCell
                  align="center"
                  sx={{
                    fontSize: "0.82rem",
                    fontWeight: 800,
                    color: "primary.onLight",
                    py: 1,
                    fontVariantNumeric: "tabular-nums",
                  }}
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
