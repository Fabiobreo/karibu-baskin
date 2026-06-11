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
import { ROLE_COLORS, sportRoleLabel } from "@/lib/constants";
import type { ConvocazioneStatRow } from "@/hooks/useConvocazioniSelection";

/** Tabella dei candidati disponibili: selezione con click riga + statistiche presenze/convocazioni. */
export default function ConvocazioniTable({
  rows,
  roleFilter,
  isSelected,
  onToggle,
}: {
  rows: ConvocazioneStatRow[];
  roleFilter: number | null;
  isSelected: (row: ConvocazioneStatRow) => boolean;
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
              <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem" }}>Giocatore</TableCell>
              <TableCell
                align="center"
                sx={{ fontWeight: 700, fontSize: "0.72rem", whiteSpace: "nowrap" }}
                title="Presenze / allenamenti eligibili nelle ultime 2 settimane"
              >
                Presenze
              </TableCell>
              <TableCell
                align="center"
                sx={{ fontWeight: 700, fontSize: "0.72rem", whiteSpace: "nowrap" }}
                title="Mancate iscrizioni + iscritto-ma-assente, su sessioni eligibili"
              >
                Assenze
              </TableCell>
              <TableCell
                align="center"
                sx={{ fontWeight: 700, fontSize: "0.72rem", whiteSpace: "nowrap" }}
                title="Convocazioni nella stagione corrente (escluso questo match)"
              >
                Partite st.
              </TableCell>
              <TableCell
                align="center"
                sx={{ fontWeight: 700, fontSize: "0.72rem", whiteSpace: "nowrap" }}
                title="Giorni dall'ultima convocazione"
              >
                Ultima conv.
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const selected = isSelected(row);
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
                      <RadioButtonUncheckedIcon sx={{ color: "text.disabled", fontSize: 22 }} />
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Avatar
                        src={row.candidate.image ?? undefined}
                        sx={{
                          width: 30,
                          height: 30,
                          fontSize: 12,
                          bgcolor: role ? ROLE_COLORS[role] : "grey.400",
                        }}
                      >
                        {row.candidate.name[0]}
                      </Avatar>
                      <Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <Typography
                            variant="body2"
                            fontWeight={selected ? 700 : 500}
                            sx={{ fontSize: "0.85rem" }}
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
                                bgcolor: "match.winBg",
                                color: "match.win",
                                fontWeight: 700,
                                fontSize: "0.6rem",
                                height: 16,
                              }}
                            />
                          )}
                        </Box>
                        {role && (
                          <Chip
                            label={sportRoleLabel(role, variant)}
                            size="small"
                            sx={{
                              bgcolor: ROLE_COLORS[role],
                              color: "common.white",
                              fontWeight: 600,
                              fontSize: "0.58rem",
                              height: 14,
                              mt: 0.25,
                            }}
                          />
                        )}
                      </Box>
                    </Box>
                  </TableCell>

                  {/* Presenze */}
                  <TableCell align="center">
                    {row.eligibleSessions === 0 ? (
                      <Typography variant="caption" color="text.disabled">
                        —
                      </Typography>
                    ) : (
                      <Tooltip
                        title={`${row.presences} presenze su ${row.eligibleSessions} allenamenti eligibili`}
                      >
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          sx={{
                            fontSize: "0.85rem",
                            color:
                              row.presences === row.eligibleSessions
                                ? "match.win"
                                : row.presences === 0
                                  ? "match.loss"
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
                      <Typography variant="caption" color="text.disabled">
                        —
                      </Typography>
                    ) : row.absences === 0 ? (
                      <Typography variant="caption" color="text.disabled">
                        0
                      </Typography>
                    ) : (
                      <Chip
                        label={row.absences}
                        size="small"
                        sx={{
                          bgcolor:
                            row.absences >= Math.max(2, row.eligibleSessions / 2)
                              ? "match.lossBg"
                              : "action.hover",
                          color:
                            row.absences >= Math.max(2, row.eligibleSessions / 2)
                              ? "match.loss"
                              : "text.secondary",
                          fontWeight: 700,
                          height: 20,
                          fontSize: "0.72rem",
                        }}
                      />
                    )}
                  </TableCell>

                  {/* Partite stagione */}
                  <TableCell align="center">
                    <Typography variant="body2" sx={{ fontSize: "0.82rem", fontWeight: 600 }}>
                      {row.seasonCallups}
                    </Typography>
                  </TableCell>

                  {/* Ultima conv. */}
                  <TableCell align="center">
                    {row.daysSinceLastCallup == null ? (
                      <Typography
                        variant="caption"
                        color="text.disabled"
                        sx={{ fontStyle: "italic" }}
                      >
                        mai
                      </Typography>
                    ) : (
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: "0.82rem",
                          fontWeight: row.daysSinceLastCallup >= 30 ? 700 : 500,
                          color: row.daysSinceLastCallup >= 30 ? "primary.main" : "text.secondary",
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
