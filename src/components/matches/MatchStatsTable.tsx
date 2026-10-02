"use client";

import { useState } from "react";
import RoleBadge from "@/components/common/RoleBadge";
import {
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableSortLabel,
  Paper,
  Typography,
  Tooltip,
} from "@mui/material";
import BlockIcon from "@mui/icons-material/Block";
import Link from "next/link";
import TeamAvatar from "@/components/teams/TeamAvatar";
import { useTranslations } from "next-intl";
import { useEntityLabels } from "@/hooks/useEntityLabels";

import { TYPE_SCALE } from "@/lib/typeScale";
import { FONT_WEIGHT } from "@/lib/fontWeight";

export interface MatchStatRow {
  id: string;
  points: number;
  twoPointers: number;
  threePointers: number;
  freeThrows: number;
  fouls: number;
  illegalFouls: number;
  shotsAttempted: number;
  notes?: string | null;
  user: {
    id: string;
    name: string | null;
    image: string | null;
    slug: string | null;
    sportRole: number | null;
    sportRoleVariant: string | null;
  } | null;
  child: {
    id: string;
    name: string;
    slug: string | null;
    sportRole: number | null;
    sportRoleVariant: string | null;
  } | null;
}

type StatKey =
  | "points"
  | "freeThrows"
  | "twoPointers"
  | "threePointers"
  | "shotsAttempted"
  | "fouls"
  | "illegalFouls";

export default function MatchStatsTable({
  stats,
  teamColor = null,
}: {
  stats: MatchStatRow[];
  /** Colore salvato della squadra per cui hanno giocato: tinta degli avatar. */
  teamColor?: string | null;
}) {
  const t = useTranslations("matches");
  const { sportRoleLabel } = useEntityLabels();
  const [sortBy, setSortBy] = useState<StatKey>("points");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const COLS: { key: StatKey; label: string; title: string; primary?: boolean }[] = [
    { key: "points", label: t("statPoints"), title: t("statPointsTitle"), primary: true },
    { key: "freeThrows", label: t("statFt"), title: t("statFtTitle") },
    { key: "twoPointers", label: t("stat2pt"), title: t("stat2ptTitle") },
    { key: "threePointers", label: t("stat3pt"), title: t("stat3ptTitle") },
    { key: "shotsAttempted", label: t("statShots"), title: t("statShotsTitle") },
    { key: "fouls", label: t("statFouls"), title: t("statFoulsTitle") },
    { key: "illegalFouls", label: t("statIllegal"), title: t("statIllegalTitle") },
  ];

  // Niente paginazione: un tabellino è una squadra, e a dieci righe per pagina
  // finiva spezzato in due. A parità di valore resta l'ordine del server (punti).
  const sorted = [...stats].sort((a, b) =>
    sortDir === "asc" ? a[sortBy] - b[sortBy] : b[sortBy] - a[sortBy]
  );

  function handleSort(col: StatKey) {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("desc");
    }
  }

  return (
    <Paper elevation={0} variant="outlined" sx={{ overflow: "hidden" }}>
      <Box sx={{ overflowX: "auto" }}>
        <Table size="small" sx={{ minWidth: 620 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: "action.hover" }}>
              <TableCell
                sx={{
                  width: 28,
                  fontWeight: FONT_WEIGHT.semibold,
                  fontSize: TYPE_SCALE.xs,
                  color: "text.secondary",
                }}
              >
                #
              </TableCell>
              <TableCell sx={{ fontWeight: FONT_WEIGHT.semibold, fontSize: TYPE_SCALE.xs }}>
                {t("statPlayer")}
              </TableCell>
              {COLS.map((col) => (
                <TableCell
                  key={col.key}
                  align="center"
                  sortDirection={sortBy === col.key ? sortDir : false}
                  sx={{
                    fontWeight: FONT_WEIGHT.semibold,
                    fontSize: TYPE_SCALE.xs,
                    color: col.primary ? "text.primary" : undefined,
                    whiteSpace: "nowrap",
                  }}
                >
                  <TableSortLabel
                    active={sortBy === col.key}
                    direction={sortBy === col.key ? sortDir : "desc"}
                    onClick={() => handleSort(col.key)}
                    title={col.title}
                    sx={{ "& .MuiTableSortLabel-icon": { fontSize: TYPE_SCALE.xs } }}
                  >
                    {col.label}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.map((stat, i) => {
              const athlete = stat.user ?? stat.child;
              const name = athlete?.name ?? "—";
              const role = athlete?.sportRole ?? null;
              const variant = athlete?.sportRoleVariant ?? null;
              const slug =
                stat.user?.slug ?? stat.user?.id ?? stat.child?.slug ?? stat.child?.id ?? null;
              const image = stat.user?.image ?? null;

              return (
                <TableRow key={stat.id} hover>
                  <TableCell
                    sx={{
                      color: "text.secondary",
                      fontWeight: FONT_WEIGHT.semibold,
                      fontSize: TYPE_SCALE.xs,
                    }}
                  >
                    {i + 1}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <TeamAvatar
                        name={name}
                        image={image}
                        color={teamColor}
                        size={24}
                        sx={{ fontSize: TYPE_SCALE.xs }}
                      />
                      <Box>
                        {slug ? (
                          <Link
                            href={`/giocatori/${slug}`}
                            style={{ textDecoration: "none", color: "inherit" }}
                          >
                            <Typography
                              variant="body2"
                              fontWeight={FONT_WEIGHT.semibold}
                              sx={{
                                fontSize: TYPE_SCALE.xs,
                                "&:hover": { textDecoration: "underline" },
                              }}
                            >
                              {name}
                            </Typography>
                          </Link>
                        ) : (
                          <Typography
                            variant="body2"
                            fontWeight={FONT_WEIGHT.semibold}
                            sx={{ fontSize: TYPE_SCALE.xs }}
                          >
                            {name}
                          </Typography>
                        )}
                        {role && <RoleBadge role={role} variant={variant} sx={{ mt: 0.2 }} />}
                        {stat.notes && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              display: "block",
                              mt: 0.3,
                              fontStyle: "italic",
                              fontSize: TYPE_SCALE.xs,
                              maxWidth: 200,
                              lineHeight: 1.3,
                            }}
                          >
                            {stat.notes}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  {COLS.map((col) => {
                    const val = stat[col.key];
                    const allowedForRole =
                      col.key === "points" || !role
                        ? true
                        : (() => {
                            if (col.key === "shotsAttempted") return role === 5;
                            if (col.key === "illegalFouls") return role === 4 || role === 5;
                            if (col.key === "freeThrows" || col.key === "fouls") return role >= 3;
                            return true;
                          })();
                    return (
                      <TableCell
                        key={col.key}
                        align="center"
                        sx={{
                          fontSize: TYPE_SCALE.sm,
                          fontWeight: col.primary ? FONT_WEIGHT.bold : FONT_WEIGHT.regular,
                          // Statistica che non vale per il ruolo: la cella dice "—".
                          // Falli (UX-29): colore solo quando sono un avviso, con
                          // tooltip e, al limite, un'icona.
                          color: col.primary
                            ? "text.primary"
                            : !allowedForRole
                              ? "text.secondary"
                              : col.key === "fouls" && val >= 5
                                ? "error.main"
                                : col.key === "fouls" && val >= 4
                                  ? "warning.main"
                                  : undefined,
                        }}
                      >
                        {allowedForRole && col.key === "fouls" && val >= 4 ? (
                          <Tooltip title={val >= 5 ? t("foulsAtLimit") : t("foulsNearLimit")}>
                            <Box
                              component="span"
                              tabIndex={0}
                              aria-label={`${val} · ${val >= 5 ? t("foulsAtLimit") : t("foulsNearLimit")}`}
                              sx={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 0.25,
                                fontWeight: FONT_WEIGHT.semibold,
                              }}
                            >
                              {val >= 5 && <BlockIcon sx={{ fontSize: 14 }} aria-hidden />}
                              {val}
                            </Box>
                          </Tooltip>
                        ) : allowedForRole ? (
                          val
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>
    </Paper>
  );
}
