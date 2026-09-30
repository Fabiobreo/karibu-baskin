"use client";
import {
  Avatar,
  Box,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import StarIcon from "@mui/icons-material/Star";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import RoleBadge from "@/components/common/RoleBadge";
import type { ConvocazioneStatRow } from "@/hooks/useConvocazioniSelection";
import { TYPE_SCALE } from "@/lib/typeScale";
import { FONT_WEIGHT } from "@/lib/fontWeight";

/** Tabella dei candidati disponibili: selezione con click riga + statistiche presenze/convocazioni. */
export default function ConvocazioniTable({
  rows,
  roleFilter,
  isSelected,
  selectedElsewhere,
  onToggle,
}: {
  rows: ConvocazioneStatRow[];
  roleFilter: number | null;
  isSelected: (row: ConvocazioneStatRow) => boolean;
  /** Amichevole interna: squadra per cui il giocatore è già convocato (selezionarlo lo sposta). */
  selectedElsewhere?: (row: ConvocazioneStatRow) => string | null;
  onToggle: (row: ConvocazioneStatRow) => void;
}) {
  if (rows.length === 0) {
    return (
      <Paper elevation={0} variant="outlined" sx={{ p: 4, textAlign: "center" }}>
        <Typography color="text.secondary">
          Nessun giocatore nella rosa
          {roleFilter !== null ? " con questo ruolo" : ""}.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={0} variant="outlined" sx={{ overflow: "hidden" }}>
      <Box sx={{ overflowX: "auto" }}>
        <Table size="small" sx={{ minWidth: 720 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: "action.hover" }}>
              <TableCell sx={{ width: 40 }} />
              <TableCell sx={{ fontWeight: FONT_WEIGHT.semibold, fontSize: TYPE_SCALE.xs }}>
                Giocatore
              </TableCell>
              <TableCell
                align="center"
                sx={{
                  fontWeight: FONT_WEIGHT.semibold,
                  fontSize: TYPE_SCALE.xs,
                  whiteSpace: "nowrap",
                }}
                title="Presenze / allenamenti eligibili nelle ultime 2 settimane"
              >
                Presenze
              </TableCell>
              <TableCell
                align="center"
                sx={{
                  fontWeight: FONT_WEIGHT.semibold,
                  fontSize: TYPE_SCALE.xs,
                  whiteSpace: "nowrap",
                }}
                title="Mancate iscrizioni + iscritto-ma-assente, su sessioni eligibili"
              >
                Assenze
              </TableCell>
              <TableCell
                align="center"
                sx={{
                  fontWeight: FONT_WEIGHT.semibold,
                  fontSize: TYPE_SCALE.xs,
                  whiteSpace: "nowrap",
                }}
                title="Convocazioni nella stagione corrente (escluso questo match)"
              >
                Partite st.
              </TableCell>
              <TableCell
                align="center"
                sx={{
                  fontWeight: FONT_WEIGHT.semibold,
                  fontSize: TYPE_SCALE.xs,
                  whiteSpace: "nowrap",
                }}
                title="Giorni dall'ultima convocazione"
              >
                Ultima conv.
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const selected = isSelected(row);
              const elsewhere = selected ? null : (selectedElsewhere?.(row) ?? null);
              const role = row.candidate.sportRole;
              const variant = row.candidate.sportRoleVariant;
              return (
                <TableRow
                  key={`${row.candidate.kind}-${row.candidate.id}`}
                  hover
                  onClick={() => onToggle(row)}
                  sx={{
                    cursor: "pointer",
                    bgcolor: selected
                      ? (theme) => alpha(theme.palette.primary.main, 0.06)
                      : undefined,
                  }}
                >
                  <TableCell>
                    {selected ? (
                      <CheckCircleIcon sx={{ color: "primary.main", fontSize: 22 }} />
                    ) : (
                      <RadioButtonUncheckedIcon sx={{ color: "text.secondary", fontSize: 22 }} />
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Avatar
                        src={row.candidate.image ?? undefined}
                        sx={{
                          width: 30,
                          height: 30,
                          fontSize: TYPE_SCALE.xs,
                          // Neutro (UX-29): il ruolo lo dice il RoleBadge accanto al nome.
                          bgcolor: "action.selected",
                          color: "text.primary",
                        }}
                      >
                        {row.candidate.name[0]}
                      </Avatar>
                      <Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <Typography
                            variant="body2"
                            fontWeight={selected ? FONT_WEIGHT.semibold : FONT_WEIGHT.regular}
                            sx={{ fontSize: TYPE_SCALE.sm }}
                          >
                            {row.candidate.name}
                          </Typography>
                          {row.candidate.isCaptain && (
                            <StarIcon sx={{ fontSize: 13, color: "medal.gold" }} />
                          )}
                          {row.availability === true && (
                            <Chip
                              label="Disponibile"
                              size="small"
                              sx={{
                                bgcolor: (theme) => alpha(theme.palette.success.main, 0.12),
                                color: "success.main",
                                fontSize: TYPE_SCALE.xs,
                                height: 20,
                              }}
                            />
                          )}
                          {row.loanFrom && (
                            <Tooltip title={`In prestito da ${row.loanFrom}`}>
                              <Chip
                                icon={<SwapHorizIcon sx={{ fontSize: "12px !important" }} />}
                                label={`Prestito · ${row.loanFrom}`}
                                size="small"
                                sx={{
                                  bgcolor: "secondary.main",
                                  color: "secondary.contrastText",
                                  fontSize: TYPE_SCALE.xs,
                                  height: 20,
                                  "& .MuiChip-icon": { color: "secondary.contrastText" },
                                }}
                              />
                            </Tooltip>
                          )}
                          {row.fromTeam && (
                            <Chip
                              label={row.fromTeam}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: TYPE_SCALE.xs, height: 20 }}
                            />
                          )}
                          {elsewhere && (
                            <Tooltip title="Selezionandolo lo sposti in questa squadra">
                              <Chip
                                label={`Convocato con ${elsewhere}`}
                                size="small"
                                sx={{
                                  bgcolor: "action.selected",
                                  color: "text.secondary",
                                  fontSize: TYPE_SCALE.xs,
                                  height: 20,
                                }}
                              />
                            </Tooltip>
                          )}
                        </Box>
                        {role && <RoleBadge role={role} variant={variant} sx={{ mt: 0.25 }} />}
                      </Box>
                    </Box>
                  </TableCell>

                  {/* Presenze */}
                  <TableCell align="center">
                    {row.eligibleSessions === 0 ? (
                      <Typography variant="caption" color="text.secondary">
                        —
                      </Typography>
                    ) : (
                      <Tooltip
                        title={`${row.presences} presenze su ${row.eligibleSessions} allenamenti eligibili`}
                      >
                        <Typography
                          variant="body2"
                          fontWeight={FONT_WEIGHT.semibold}
                          sx={{
                            fontSize: TYPE_SCALE.sm,
                            color:
                              row.presences === row.eligibleSessions
                                ? "success.main"
                                : row.presences === 0
                                  ? "error.main"
                                  : "text.primary",
                          }}
                        >
                          {row.presences}/{row.eligibleSessions}
                        </Typography>
                      </Tooltip>
                    )}
                  </TableCell>

                  {/* Assenze */}
                  <TableCell align="center">
                    {row.eligibleSessions === 0 ? (
                      <Typography variant="caption" color="text.secondary">
                        —
                      </Typography>
                    ) : row.absences === 0 ? (
                      <Typography variant="caption" color="text.secondary">
                        0
                      </Typography>
                    ) : (
                      <Chip
                        label={row.absences}
                        size="small"
                        sx={{
                          bgcolor:
                            row.absences >= Math.max(2, row.eligibleSessions / 2)
                              ? (theme) => alpha(theme.palette.error.main, 0.12)
                              : "action.hover",
                          color:
                            row.absences >= Math.max(2, row.eligibleSessions / 2)
                              ? "error.main"
                              : "text.secondary",
                          height: 20,
                          fontSize: TYPE_SCALE.xs,
                        }}
                      />
                    )}
                  </TableCell>

                  {/* Partite stagione */}
                  <TableCell align="center">
                    <Typography
                      variant="body2"
                      sx={{ fontSize: TYPE_SCALE.sm, fontWeight: FONT_WEIGHT.semibold }}
                    >
                      {row.seasonCallups}
                    </Typography>
                  </TableCell>

                  {/* Ultima conv. */}
                  <TableCell align="center">
                    {row.daysSinceLastCallup == null ? (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontStyle: "italic" }}
                      >
                        mai
                      </Typography>
                    ) : (
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: TYPE_SCALE.sm,
                          fontWeight:
                            row.daysSinceLastCallup >= 30
                              ? FONT_WEIGHT.semibold
                              : FONT_WEIGHT.regular,
                          // Da tanto non convocato: e' un avviso, non un'azione (UX-29).
                          color: row.daysSinceLastCallup >= 30 ? "warning.main" : "text.secondary",
                        }}
                      >
                        {row.daysSinceLastCallup}g
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>
    </Paper>
  );
}
