"use client";

import { Fragment, useState } from "react";
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
import type { Theme } from "@mui/material/styles";
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

/** Larghezza della colonna "#": e' anche lo scarto della colonna del nome fissa. */
const NUM_COL_WIDTH = 40;

/**
 * Colonne "#" e nome fisse a sinistra mentre la tabella scorre (UX-51): fondo
 * pieno della carta, piu' il velo della riga di intestazione o del passaggio
 * del mouse, che la riga trasparente non darebbe alla cella fissa.
 */
function stickyCell(left: number, head = false) {
  const veil = (theme: Theme) =>
    `linear-gradient(${theme.palette.action.hover}, ${theme.palette.action.hover})`;
  return {
    position: "sticky",
    left,
    zIndex: 1,
    bgcolor: "background.paper",
    ...(head
      ? { backgroundImage: veil }
      : { ".MuiTableRow-hover:hover > &": { backgroundImage: veil } }),
  } as const;
}

/**
 * Su telefono la colonna del nome si stringe (UX-51): con nomi lunghi le colonne
 * fisse prendevano 194 px su 356, e dei numeri se ne vedeva uno. Il nome si
 * tronca con i puntini (per intero nel `title` e per i lettori di schermo) e le
 * celle hanno meno margine, cosi' restano visibili almeno tre colonne di numeri.
 */
const NAME_MAX_WIDTH_XS = 88;
const CELL_PX = { xs: 1, sm: 2 } as const;

/** Filo a destra della colonna del nome: separa la parte fissa da quella che scorre. */
const NAME_COL_EDGE = {
  boxShadow: (theme: Theme) => `inset -1px 0 0 ${theme.palette.divider}`,
} as const;

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
      <Box
        // Su telefono la tabella scorre di lato: la regione riceve il focus,
        // altrimenti da tastiera le ultime colonne non si raggiungono.
        role="region"
        aria-label={t("tabStats")}
        tabIndex={0}
        sx={(theme) => ({
          overflowX: "auto",
          // Ombra sul bordo destro finche' c'e' altro da scorrere (UX-51): la
          // copertura `local` scorre col contenuto e la nasconde a fine corsa.
          background: [
            `linear-gradient(to right, transparent, ${theme.palette.background.paper} 70%) right center / 40px 100% no-repeat local`,
            `radial-gradient(farthest-side at 100% 50%, color-mix(in srgb, ${theme.palette.text.primary} 30%, transparent), transparent) right center / 16px 100% no-repeat scroll`,
          ].join(", "),
          backgroundColor: "background.paper",
        })}
      >
        <Table size="small" sx={{ minWidth: 620 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: "action.hover" }}>
              <TableCell
                sx={{
                  ...stickyCell(0, true),
                  width: NUM_COL_WIDTH,
                  minWidth: NUM_COL_WIDTH,
                  px: 1,
                  fontWeight: FONT_WEIGHT.semibold,
                  fontSize: TYPE_SCALE.xs,
                  color: "text.secondary",
                }}
              >
                #
              </TableCell>
              <TableCell
                sx={{
                  ...stickyCell(NUM_COL_WIDTH, true),
                  ...NAME_COL_EDGE,
                  px: CELL_PX,
                  fontWeight: FONT_WEIGHT.semibold,
                  fontSize: TYPE_SCALE.xs,
                }}
              >
                {t("statPlayer")}
              </TableCell>
              {COLS.map((col) => (
                <TableCell
                  key={col.key}
                  align="center"
                  sortDirection={sortBy === col.key ? sortDir : false}
                  sx={{
                    px: CELL_PX,
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

              // Le note escono dalla colonna fissa: stanno in una riga sotto,
              // cosi' il nome resta su una riga sola (UX-51).
              const noBottom = stat.notes ? { borderBottom: "none" } : {};
              // La nota, nella riga sotto, descrive la cella del giocatore.
              const noteId = stat.notes ? `stat-note-${stat.id}` : undefined;
              const nameSx = {
                fontSize: TYPE_SCALE.xs,
                maxWidth: { xs: NAME_MAX_WIDTH_XS, sm: "none" },
              };

              return (
                <Fragment key={stat.id}>
                  <TableRow hover>
                    <TableCell
                      sx={{
                        ...stickyCell(0),
                        ...noBottom,
                        width: NUM_COL_WIDTH,
                        minWidth: NUM_COL_WIDTH,
                        px: 1,
                        color: "text.secondary",
                        fontWeight: FONT_WEIGHT.semibold,
                        fontSize: TYPE_SCALE.xs,
                      }}
                    >
                      {i + 1}
                    </TableCell>
                    <TableCell
                      aria-describedby={noteId}
                      sx={{
                        ...stickyCell(NUM_COL_WIDTH),
                        ...NAME_COL_EDGE,
                        ...noBottom,
                        px: CELL_PX,
                      }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1, whiteSpace: "nowrap" }}
                      >
                        <TeamAvatar
                          name={name}
                          image={image}
                          color={teamColor}
                          size={24}
                          sx={{ fontSize: TYPE_SCALE.xs }}
                        />
                        <Box sx={{ minWidth: 0 }}>
                          {slug ? (
                            <Link
                              href={`/giocatori/${slug}`}
                              style={{ textDecoration: "none", color: "inherit" }}
                            >
                              <Typography
                                variant="body2"
                                fontWeight={FONT_WEIGHT.semibold}
                                noWrap
                                title={name}
                                sx={{ ...nameSx, "&:hover": { textDecoration: "underline" } }}
                              >
                                {name}
                              </Typography>
                            </Link>
                          ) : (
                            <Typography
                              variant="body2"
                              fontWeight={FONT_WEIGHT.semibold}
                              noWrap
                              title={name}
                              sx={nameSx}
                            >
                              {name}
                            </Typography>
                          )}
                          {role && <RoleBadge role={role} variant={variant} sx={{ mt: 0.2 }} />}
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
                            ...noBottom,
                            px: CELL_PX,
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
                  {stat.notes && (
                    <TableRow>
                      <TableCell
                        colSpan={COLS.length + 2}
                        sx={{ pt: 0, pr: 1, pl: `${NUM_COL_WIDTH}px` }}
                      >
                        <Typography
                          id={noteId}
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            // Fissa a sinistra come la colonna del nome: scorrendo
                            // la tabella la nota resta sotto il giocatore.
                            position: "sticky",
                            left: NUM_COL_WIDTH,
                            display: "inline-block",
                            maxWidth: "calc(100vw - 96px)",
                            pl: 6,
                            fontStyle: "italic",
                            lineHeight: 1.3,
                          }}
                        >
                          {stat.notes}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </Box>
    </Paper>
  );
}
