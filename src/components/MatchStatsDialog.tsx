"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Typography,
  Box,
  TextField,
  Alert,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableFooter,
  Avatar,
  Chip,
  Paper,
} from "@mui/material";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import { ROLE_COLORS, sportRoleLabel } from "@/lib/constants";
import { STAT_FIELDS_BY_ROLE, computePoints, type StatField } from "@/lib/schemas/match";

interface CalledPlayer {
  id: string;
  userId: string | null;
  childId: string | null;
  user: {
    id: string;
    name: string | null;
    image: string | null;
    sportRole: number | null;
    sportRoleVariant: string | null;
  } | null;
  child: {
    id: string;
    name: string;
    sportRole: number | null;
    sportRoleVariant: string | null;
  } | null;
}

interface ExistingStat {
  id: string;
  userId: string | null;
  childId: string | null;
  points: number;
  twoPointers: number;
  threePointers: number;
  freeThrows: number;
  fouls: number;
  illegalFouls: number;
  shotsAttempted: number;
  notes?: string | null;
}

interface StatRow {
  key: string;
  userId: string | null;
  childId: string | null;
  name: string;
  image: string | null;
  sportRole: number | null;
  sportRoleVariant: string | null;
  twoPointers: string;
  threePointers: string;
  freeThrows: string;
  fouls: string;
  illegalFouls: string;
  shotsAttempted: string;
  notes: string;
  hasExistingStats: boolean;
}

const STAT_COLS: { key: StatField; label: string; title: string }[] = [
  { key: "freeThrows", label: "1pt", title: "Tiri liberi" },
  { key: "twoPointers", label: "2pt", title: "Canestri da 2 punti" },
  { key: "threePointers", label: "3pt", title: "Canestri da 3 punti" },
  { key: "fouls", label: "Falli", title: "Falli" },
  { key: "illegalFouls", label: "Illegali", title: "Falli illegali" },
  { key: "shotsAttempted", label: "Tiri", title: "Tiri tentati" },
];

const STAT_FIELDS: readonly StatField[] = STAT_COLS.map((c) => c.key);

function isAllowed(role: number | null, field: StatField): boolean {
  if (!role) return true;
  return STAT_FIELDS_BY_ROLE[role]?.includes(field) ?? false;
}

interface Props {
  open: boolean;
  onClose: () => void;
  matchId: string;
  matchLabel: string;
  onStatsSaved?: (count: number) => void;
}

export default function MatchStatsDialog({
  open,
  onClose,
  matchId,
  matchLabel,
  onStatsSaved,
}: Props) {
  const [rows, setRows] = useState<StatRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError("");
    setLoading(true);

    Promise.all([
      fetch(`/api/matches/${matchId}/callups`).then((r) => r.json()),
      fetch(`/api/matches/${matchId}/stats`).then((r) => r.json()),
    ])
      .then(([callups, existingStats]: [CalledPlayer[], ExistingStat[]]) => {
        const statsMap = new Map<string, ExistingStat>();
        for (const s of existingStats) {
          statsMap.set(s.userId ?? s.childId ?? "", s);
        }

        const built: StatRow[] = callups.map((c) => {
          const person = c.user ?? c.child!;
          const key = c.userId ?? c.childId ?? "";
          const ex = statsMap.get(key);
          return {
            key,
            userId: c.userId,
            childId: c.childId,
            name: person.name ?? "—",
            image: c.user?.image ?? null,
            sportRole: person.sportRole,
            sportRoleVariant:
              (person as { sportRoleVariant?: string | null }).sportRoleVariant ?? null,
            twoPointers: String(ex?.twoPointers ?? 0),
            threePointers: String(ex?.threePointers ?? 0),
            freeThrows: String(ex?.freeThrows ?? 0),
            fouls: String(ex?.fouls ?? 0),
            illegalFouls: String(ex?.illegalFouls ?? 0),
            shotsAttempted: String(ex?.shotsAttempted ?? 0),
            notes: ex?.notes ?? "",
            hasExistingStats: ex !== undefined,
          };
        });

        setRows(built);
      })
      .catch(() => setError("Errore nel caricamento dei dati"))
      .finally(() => setLoading(false));
  }, [open, matchId]);

  function update(key: string, field: StatField, value: string) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  function updateNote(key: string, value: string) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, notes: value } : r)));
  }

  function rowPoints(r: StatRow): number {
    return computePoints({
      twoPointers: parseInt(r.twoPointers || "0", 10) || 0,
      threePointers: parseInt(r.threePointers || "0", 10) || 0,
      freeThrows: parseInt(r.freeThrows || "0", 10) || 0,
    });
  }

  const totals = rows.reduce(
    (acc, r) => {
      for (const f of STAT_FIELDS) {
        acc[f] += parseInt(r[f] || "0", 10) || 0;
      }
      acc.points += rowPoints(r);
      return acc;
    },
    {
      twoPointers: 0,
      threePointers: 0,
      freeThrows: 0,
      fouls: 0,
      illegalFouls: 0,
      shotsAttempted: 0,
      points: 0,
    }
  );

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const payload = rows
        .filter((r) => {
          if (r.hasExistingStats) return true;
          return (
            STAT_FIELDS.some((f) => parseInt(r[f] || "0", 10) > 0) || r.notes.trim().length > 0
          );
        })
        .map((r) => {
          // Azzera campi non ammessi per il ruolo
          const entry: Record<string, number | string> = {
            ...(r.userId ? { userId: r.userId } : {}),
            ...(r.childId ? { childId: r.childId } : {}),
          };
          for (const f of STAT_FIELDS) {
            entry[f] = isAllowed(r.sportRole, f) ? parseInt(r[f] || "0", 10) || 0 : 0;
          }
          if (r.notes.trim()) entry.notes = r.notes.trim();
          return entry;
        });
      const res = await fetch(`/api/matches/${matchId}/stats`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setError("Errore nel salvataggio delle statistiche");
        return;
      }
      onStatsSaved?.(payload.length);
      onClose();
    } catch {
      setError("Errore di rete");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 700 }}>
        <LeaderboardIcon color="primary" />
        Statistiche giocatori
        <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
          — {matchLabel}
        </Typography>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : rows.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography color="text.secondary">
              Nessun convocato per questa partita. Imposta prima i convocati dalla colonna
              &quot;Convocati&quot;.
            </Typography>
          </Box>
        ) : (
          <Paper elevation={0} variant="outlined" sx={{ overflow: "hidden", mt: 1 }}>
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small" sx={{ minWidth: 760 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: "rgba(0,0,0,0.03)" }}>
                    <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>Giocatore</TableCell>
                    {STAT_COLS.map((col) => (
                      <TableCell
                        key={col.key}
                        align="center"
                        title={col.title}
                        sx={{ fontWeight: 700, fontSize: "0.75rem", minWidth: 52 }}
                      >
                        {col.label}
                      </TableCell>
                    ))}
                    <TableCell
                      align="center"
                      title="Punti calcolati (2pt×2 + 3pt×3 + TL)"
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        minWidth: 52,
                        color: "primary.main",
                      }}
                    >
                      Pt
                    </TableCell>
                    <TableCell
                      sx={{ fontWeight: 700, fontSize: "0.75rem", minWidth: 120 }}
                      title="Note (opzionale)"
                    >
                      Note
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => {
                    const pts = rowPoints(row);
                    return (
                      <TableRow key={row.key}>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Avatar
                              src={row.image ?? undefined}
                              sx={{ width: 24, height: 24, fontSize: 10 }}
                            >
                              {row.name[0]}
                            </Avatar>
                            <Box>
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                sx={{ fontSize: "0.82rem" }}
                              >
                                {row.name}
                              </Typography>
                              {row.sportRole && (
                                <Chip
                                  label={sportRoleLabel(
                                    row.sportRole,
                                    row.sportRoleVariant ?? null
                                  )}
                                  size="small"
                                  sx={{
                                    bgcolor: ROLE_COLORS[row.sportRole],
                                    color: "#fff",
                                    fontWeight: 600,
                                    fontSize: "0.55rem",
                                    height: 14,
                                    mt: 0.2,
                                  }}
                                />
                              )}
                            </Box>
                          </Box>
                        </TableCell>
                        {STAT_COLS.map((col) => {
                          const allowed = isAllowed(row.sportRole, col.key);
                          return (
                            <TableCell key={col.key} align="center" sx={{ py: 0.5, px: 0.5 }}>
                              {allowed ? (
                                <TextField
                                  type="number"
                                  value={row[col.key]}
                                  onChange={(e) => update(row.key, col.key, e.target.value)}
                                  size="small"
                                  slotProps={{
                                    htmlInput: {
                                      min: 0,
                                      style: {
                                        textAlign: "center",
                                        padding: "4px 6px",
                                        width: 40,
                                      },
                                    },
                                  }}
                                  sx={{ "& .MuiOutlinedInput-root": { fontSize: "0.82rem" } }}
                                />
                              ) : (
                                <Typography
                                  variant="body2"
                                  color="text.disabled"
                                  sx={{ fontSize: "0.78rem" }}
                                  title={
                                    row.sportRole
                                      ? `Non applicabile per ${sportRoleLabel(row.sportRole, row.sportRoleVariant ?? null)}`
                                      : "Non applicabile"
                                  }
                                >
                                  —
                                </Typography>
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell
                          align="center"
                          sx={{
                            py: 0.5,
                            px: 0.5,
                            fontWeight: 800,
                            color: "primary.main",
                            fontSize: "0.9rem",
                          }}
                        >
                          {pts}
                        </TableCell>
                        <TableCell sx={{ py: 0.5, px: 0.75 }}>
                          <TextField
                            value={row.notes}
                            onChange={(e) => updateNote(row.key, e.target.value)}
                            size="small"
                            placeholder="Opzionale"
                            slotProps={{
                              htmlInput: {
                                maxLength: 500,
                                style: { padding: "4px 8px", fontSize: "0.78rem" },
                              },
                            }}
                            sx={{ width: 140, "& .MuiOutlinedInput-root": { fontSize: "0.78rem" } }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow sx={{ bgcolor: "rgba(0,0,0,0.03)" }}>
                    <TableCell
                      sx={{ fontWeight: 700, fontSize: "0.75rem", color: "text.secondary" }}
                    >
                      Totale
                    </TableCell>
                    {STAT_COLS.map((col) => (
                      <TableCell
                        key={col.key}
                        align="center"
                        sx={{ fontWeight: 800, fontSize: "0.82rem", color: "text.primary" }}
                      >
                        {totals[col.key]}
                      </TableCell>
                    ))}
                    <TableCell
                      align="center"
                      sx={{ fontWeight: 800, fontSize: "0.9rem", color: "primary.main" }}
                    >
                      {totals.points}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              </Table>
            </Box>
          </Paper>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Annulla
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || loading || rows.length === 0}
          startIcon={saving ? <CircularProgress size={16} /> : undefined}
        >
          Salva statistiche
        </Button>
      </DialogActions>
    </Dialog>
  );
}
