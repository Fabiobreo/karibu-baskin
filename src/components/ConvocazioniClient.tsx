"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Chip,
  Avatar,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  CircularProgress,
  Tooltip,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tabs,
  Tab,
} from "@mui/material";
import GroupsIcon from "@mui/icons-material/Groups";
import StarIcon from "@mui/icons-material/Star";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ROLE_COLORS, sportRoleLabel } from "@/lib/constants";
import { useToast } from "@/context/ToastContext";
import type { CandidateInput } from "@/lib/callupStats";
import type { TeamCallupContext } from "@/lib/callupContext";

interface StatRow {
  candidate: CandidateInput;
  presences: number;
  absences: number;
  eligibleSessions: number;
  seasonCallups: number;
  daysSinceLastCallup: number | null;
}

interface Props {
  matchId: string;
  matchLabel: string;
  matchDateISO: string;
  windowEligibleSessions: number;
  teams: TeamCallupContext[];
}

type SortKey = "role" | "presences" | "lastCallup" | "seasonCallups" | "name";

const ROLES = [1, 2, 3, 4, 5] as const;

interface TeamSelectionState {
  userIds: Set<string>;
  childIds: Set<string>;
}

export default function ConvocazioniClient({
  matchId,
  matchLabel,
  windowEligibleSessions,
  teams,
}: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const isMulti = teams.length > 1;

  // Stato selezione per ciascuna squadra
  const [selectionByTeam, setSelectionByTeam] = useState<Map<string, TeamSelectionState>>(() => {
    const m = new Map<string, TeamSelectionState>();
    for (const t of teams) {
      m.set(t.id, {
        userIds: new Set(t.initialSelectedUserIds),
        childIds: new Set(t.initialSelectedChildIds),
      });
    }
    return m;
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("role");
  const [roleFilter, setRoleFilter] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const activeTeam = teams[activeIndex] ?? teams[0];
  const activeSelection = selectionByTeam.get(activeTeam.id) ?? {
    userIds: new Set<string>(),
    childIds: new Set<string>(),
  };

  function isSelected(row: StatRow): boolean {
    return row.candidate.kind === "user"
      ? activeSelection.userIds.has(row.candidate.id)
      : activeSelection.childIds.has(row.candidate.id);
  }

  function updateActiveSelection(updater: (curr: TeamSelectionState) => TeamSelectionState) {
    setSelectionByTeam((prev) => {
      const next = new Map(prev);
      const curr = next.get(activeTeam.id) ?? {
        userIds: new Set<string>(),
        childIds: new Set<string>(),
      };
      next.set(activeTeam.id, updater(curr));
      return next;
    });
  }

  function toggle(row: StatRow) {
    if (row.candidate.kind === "user") {
      updateActiveSelection((curr) => {
        const nextUserIds = new Set(curr.userIds);
        if (nextUserIds.has(row.candidate.id)) nextUserIds.delete(row.candidate.id);
        else nextUserIds.add(row.candidate.id);
        return { userIds: nextUserIds, childIds: curr.childIds };
      });
    } else {
      updateActiveSelection((curr) => {
        const nextChildIds = new Set(curr.childIds);
        if (nextChildIds.has(row.candidate.id)) nextChildIds.delete(row.candidate.id);
        else nextChildIds.add(row.candidate.id);
        return { userIds: curr.userIds, childIds: nextChildIds };
      });
    }
  }

  function selectAll() {
    updateActiveSelection(() => ({
      userIds: new Set(
        activeTeam.stats.filter((s) => s.candidate.kind === "user").map((s) => s.candidate.id)
      ),
      childIds: new Set(
        activeTeam.stats.filter((s) => s.candidate.kind === "child").map((s) => s.candidate.id)
      ),
    }));
  }

  function clearAll() {
    updateActiveSelection(() => ({ userIds: new Set(), childIds: new Set() }));
  }

  const filtered = useMemo(() => {
    return activeTeam.stats.filter((s) =>
      roleFilter === null ? true : s.candidate.sportRole === roleFilter
    );
  }, [activeTeam.stats, roleFilter]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      switch (sortKey) {
        case "presences":
          return b.presences - a.presences || a.candidate.name.localeCompare(b.candidate.name);
        case "lastCallup": {
          const av = a.daysSinceLastCallup ?? Number.POSITIVE_INFINITY;
          const bv = b.daysSinceLastCallup ?? Number.POSITIVE_INFINITY;
          return bv - av || a.candidate.name.localeCompare(b.candidate.name);
        }
        case "seasonCallups":
          return (
            a.seasonCallups - b.seasonCallups || a.candidate.name.localeCompare(b.candidate.name)
          );
        case "name":
          return a.candidate.name.localeCompare(b.candidate.name);
        case "role":
        default:
          return (
            (a.candidate.sportRole ?? 99) - (b.candidate.sportRole ?? 99) ||
            a.candidate.name.localeCompare(b.candidate.name)
          );
      }
    });
    return copy;
  }, [filtered, sortKey]);

  const coverage = useMemo(() => {
    const map = new Map<number, number>();
    for (const s of activeTeam.stats) {
      if (!isSelected(s)) continue;
      const r = s.candidate.sportRole;
      if (r == null) continue;
      map.set(r, (map.get(r) ?? 0) + 1);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTeam.stats, selectionByTeam, activeIndex]);

  const totalSelectedActive = activeSelection.userIds.size + activeSelection.childIds.size;
  const totalSelectedAll = Array.from(selectionByTeam.values()).reduce(
    (acc, s) => acc + s.userIds.size + s.childIds.size,
    0
  );

  async function handleSave() {
    setSaving(true);
    try {
      // Una PUT per ogni squadra (anche se è una sola). Per le interne salviamo
      // entrambe in sequenza; se una fallisce, comunichiamo l'errore ma proviamo
      // comunque la successiva.
      const errors: string[] = [];
      for (const team of teams) {
        const sel = selectionByTeam.get(team.id);
        const userIds = sel ? [...sel.userIds] : [];
        const childIds = sel ? [...sel.childIds] : [];
        const res = await fetch(`/api/matches/${matchId}/callups`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teamId: team.id,
            userIds,
            childIds,
          }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          errors.push(`${team.name}: ${data.error ?? "errore"}`);
        }
      }
      if (errors.length > 0) {
        showToast({
          message: `Errori salvataggio — ${errors.join("; ")}`,
          severity: "error",
        });
        return;
      }
      showToast({ message: `Salvati ${totalSelectedAll} convocati`, severity: "success" });
      router.refresh();
    } catch {
      showToast({ message: "Errore di rete", severity: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Back */}
      <Box sx={{ mb: 2 }}>
        <Link href="/admin/partite" style={{ textDecoration: "none" }}>
          <Button
            startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />}
            size="small"
            sx={{ color: "text.secondary", fontSize: "0.78rem" }}
          >
            Partite
          </Button>
        </Link>
      </Box>

      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
          <GroupsIcon color="primary" />
          <Typography
            variant="overline"
            color="primary"
            fontWeight={700}
            sx={{ letterSpacing: "0.1em" }}
          >
            Convocazioni
          </Typography>
        </Box>
        <Typography variant="h5" fontWeight={800}>
          {matchLabel}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isMulti
            ? "Amichevole interna — convoca i giocatori per ciascuna squadra"
            : `Stagione ${activeTeam.season}`}
          {" — presenze calcolate sulle ultime 2 settimane"}
          {windowEligibleSessions > 0
            ? ` (${windowEligibleSessions} ${windowEligibleSessions === 1 ? "allenamento gestito" : "allenamenti gestiti"})`
            : " (nessun allenamento gestito in finestra)"}
        </Typography>
      </Box>

      {/* Tab squadra (solo se interno con 2 squadre) */}
      {isMulti && (
        <Paper variant="outlined" elevation={0} sx={{ mb: 2 }}>
          <Tabs
            value={activeIndex}
            onChange={(_, v) => setActiveIndex(v as number)}
            variant="fullWidth"
            sx={{
              "& .MuiTab-root": { textTransform: "none", fontWeight: 700, fontSize: "0.92rem" },
            }}
          >
            {teams.map((t, idx) => {
              const sel = selectionByTeam.get(t.id);
              const count = sel ? sel.userIds.size + sel.childIds.size : 0;
              return (
                <Tab
                  key={t.id}
                  label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          bgcolor: t.color ?? "#E65100",
                        }}
                      />
                      <span>{t.name}</span>
                      <Chip
                        label={count}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: "0.7rem",
                          bgcolor: idx === activeIndex ? "primary.main" : "rgba(0,0,0,0.06)",
                          color: idx === activeIndex ? "#fff" : "text.secondary",
                          fontWeight: 800,
                        }}
                      />
                    </Box>
                  }
                />
              );
            })}
          </Tabs>
        </Paper>
      )}

      {/* Sticky toolbar */}
      <Paper
        elevation={0}
        variant="outlined"
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 2,
          p: 1.5,
          mb: 2,
          bgcolor: "background.paper",
          display: "flex",
          flexWrap: "wrap",
          gap: 1.5,
          alignItems: "center",
        }}
      >
        <Chip
          icon={<CheckCircleIcon sx={{ fontSize: "16px !important" }} />}
          label={`${totalSelectedActive} convocati${isMulti ? ` per ${activeTeam.name}` : ""}`}
          color="primary"
          sx={{ fontWeight: 700 }}
        />

        {/* Copertura ruoli */}
        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
          <Typography
            variant="caption"
            color="text.disabled"
            fontWeight={700}
            sx={{ textTransform: "uppercase", letterSpacing: "0.06em", mr: 0.5 }}
          >
            Copertura:
          </Typography>
          {ROLES.map((r) => {
            const count = coverage.get(r) ?? 0;
            return (
              <Chip
                key={r}
                label={`R${r}: ${count}`}
                size="small"
                sx={{
                  bgcolor: count > 0 ? ROLE_COLORS[r] : "transparent",
                  color: count > 0 ? "#fff" : "text.disabled",
                  fontWeight: 700,
                  fontSize: "0.7rem",
                  border: `1px solid ${count > 0 ? ROLE_COLORS[r] : "rgba(0,0,0,0.15)"}`,
                }}
              />
            );
          })}
        </Stack>

        <Box sx={{ display: "flex", gap: 0.5, ml: "auto" }}>
          <Button size="small" onClick={selectAll}>
            Tutti
          </Button>
          <Button size="small" color="inherit" onClick={clearAll}>
            Nessuno
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={14} /> : undefined}
          >
            Salva{isMulti ? " entrambe" : ""}
          </Button>
        </Box>
      </Paper>

      {/* Filtri + sort */}
      <Paper
        elevation={0}
        variant="outlined"
        sx={{ p: 1.5, mb: 2, display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}
      >
        <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", flexWrap: "wrap" }}>
          <Typography
            variant="caption"
            color="text.disabled"
            fontWeight={700}
            sx={{ textTransform: "uppercase", letterSpacing: "0.06em", mr: 0.5 }}
          >
            Ruolo:
          </Typography>
          <Chip
            label="Tutti"
            size="small"
            variant={roleFilter === null ? "filled" : "outlined"}
            color={roleFilter === null ? "primary" : "default"}
            onClick={() => setRoleFilter(null)}
            sx={{ fontWeight: 600, cursor: "pointer", fontSize: "0.72rem" }}
          />
          {ROLES.map((r) => (
            <Chip
              key={r}
              label={`R${r}`}
              size="small"
              onClick={() => setRoleFilter(r)}
              sx={{
                fontWeight: 700,
                cursor: "pointer",
                fontSize: "0.72rem",
                bgcolor: roleFilter === r ? ROLE_COLORS[r] : "transparent",
                color: roleFilter === r ? "#fff" : "text.primary",
                border: `1px solid ${roleFilter === r ? ROLE_COLORS[r] : "rgba(0,0,0,0.23)"}`,
              }}
            />
          ))}
        </Box>

        <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", flexWrap: "wrap" }}>
          <Typography
            variant="caption"
            color="text.disabled"
            fontWeight={700}
            sx={{ textTransform: "uppercase", letterSpacing: "0.06em", mr: 0.5 }}
          >
            Ordina:
          </Typography>
          <ToggleButtonGroup
            size="small"
            value={sortKey}
            exclusive
            onChange={(_, v) => v && setSortKey(v as SortKey)}
            sx={{
              "& .MuiToggleButton-root": {
                fontSize: "0.7rem",
                textTransform: "none",
                py: 0.25,
                px: 1,
              },
            }}
          >
            <ToggleButton value="role">Ruolo</ToggleButton>
            <ToggleButton value="presences">Più presenze</ToggleButton>
            <ToggleButton value="lastCallup">Fermo da più</ToggleButton>
            <ToggleButton value="seasonCallups">Meno partite</ToggleButton>
            <ToggleButton value="name">Nome</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Paper>

      {/* Tabella candidati */}
      {sorted.length === 0 ? (
        <Paper elevation={0} variant="outlined" sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">
            Nessun giocatore nella rosa
            {roleFilter !== null ? " con questo ruolo" : ""}.
          </Typography>
        </Paper>
      ) : (
        <Paper elevation={0} variant="outlined" sx={{ overflow: "hidden" }}>
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small" sx={{ minWidth: 720 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "rgba(0,0,0,0.03)" }}>
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
                {sorted.map((row) => {
                  const selected = isSelected(row);
                  const role = row.candidate.sportRole;
                  const variant = row.candidate.sportRoleVariant;
                  return (
                    <TableRow
                      key={`${row.candidate.kind}-${row.candidate.id}`}
                      hover
                      onClick={() => toggle(row)}
                      sx={{
                        cursor: "pointer",
                        bgcolor: selected ? "rgba(230,81,0,0.06)" : undefined,
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
                                <StarIcon sx={{ fontSize: 13, color: "#F9A825" }} />
                              )}
                            </Box>
                            {role && (
                              <Chip
                                label={sportRoleLabel(role, variant)}
                                size="small"
                                sx={{
                                  bgcolor: ROLE_COLORS[role],
                                  color: "#fff",
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
                                    ? "#2E7D32"
                                    : row.presences === 0
                                      ? "#C62828"
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
                                  ? "#FFEBEE"
                                  : "rgba(0,0,0,0.04)",
                              color:
                                row.absences >= Math.max(2, row.eligibleSessions / 2)
                                  ? "#C62828"
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
                              color: row.daysSinceLastCallup >= 30 ? "#E65100" : "text.secondary",
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
      )}
    </Container>
  );
}
