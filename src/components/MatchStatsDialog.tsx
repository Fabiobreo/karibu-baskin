"use client";


import { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, CircularProgress, Typography, Box, TextField,
  Alert, Table, TableHead, TableRow, TableCell, TableBody,
  Avatar, Chip, Paper,
} from "@mui/material";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import { ROLE_COLORS, sportRoleLabel } from "@/lib/constants";

interface CalledPlayer {
  id: string;
  userId: string | null;
  childId: string | null;
  user: { id: string; name: string | null; image: string | null; sportRole: number | null; sportRoleVariant: string | null } | null;
  child: { id: string; name: string; sportRole: number | null; sportRoleVariant: string | null } | null;
}

interface ExistingStat {
  id: string;
  userId: string | null;
  childId: string | null;
  points: number;
  baskets: number;
  assists: number;
  rebounds: number;
  fouls: number;
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
  points: string;
  baskets: string;
  assists: string;
  rebounds: string;
  fouls: string;
  notes: string;
  hasExistingStats: boolean;
}

type StatField = "points" | "baskets" | "assists" | "rebounds" | "fouls";

const STAT_COLS: { key: StatField; label: string; title: string }[] = [
  { key: "points",   label: "Pt",  title: "Punti" },
  { key: "baskets",  label: "Can", title: "Canestri" },
  { key: "assists",  label: "Ast", title: "Assist" },
  { key: "rebounds", label: "Rim", title: "Rimbalzi" },
  { key: "fouls",    label: "Fal", title: "Falli" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  matchId: string;
  matchLabel: string;
  onStatsSaved?: (count: number) => void;
}

export default function MatchStatsDialog({ open, onClose, matchId, matchLabel, onStatsSaved }: Props) {
  const [rows, setRows]       = useState<StatRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => {
    if (!open) return;
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
            userId:          c.userId,
            childId:         c.childId,
            name:            person.name ?? "—",
            image:           c.user?.image ?? null,
            sportRole:       person.sportRole,
            sportRoleVariant: (person as { sportRoleVariant?: string | null }).sportRoleVariant ?? null,
            points:   String(ex?.points   ?? 0),
            baskets:  String(ex?.baskets  ?? 0),
            assists:  String(ex?.assists  ?? 0),
            rebounds: String(ex?.rebounds ?? 0),
            fouls:    String(ex?.fouls    ?? 0),
            notes:    ex?.notes ?? "",
            hasExistingStats: ex !== undefined,
          };
        });

        setRows(built);
      })
      .catch(() => setError("Errore nel caricamento dei dati"))
      .finally(() => setLoading(false));
  }, [open, matchId]);

  function update(key: string, field: StatField, value: string) {
    setRows((prev) => prev.map((r) => r.key === key ? { ...r, [field]: value } : r));
  }

  function updateNote(key: string, value: string) {
    setRows((prev) => prev.map((r) => r.key === key ? { ...r, notes: value } : r));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      // che non hanno ancora statistiche nel DB. Se il record esiste già (hasExistingStats),
      // viene sempre incluso per permettere di azzerare valori precedentemente inseriti.
      const payload = rows
        .filter((r) => {
          if (r.hasExistingStats) return true;
          return (
            parseInt(r.points   || "0", 10) > 0 ||
            parseInt(r.baskets  || "0", 10) > 0 ||
            parseInt(r.assists  || "0", 10) > 0 ||
            parseInt(r.rebounds || "0", 10) > 0 ||
            parseInt(r.fouls    || "0", 10) > 0 ||
            r.notes.trim().length > 0
          );
        })
        .map((r) => ({
          ...(r.userId   ? { userId:   r.userId   } : {}),
          ...(r.childId  ? { childId:  r.childId  } : {}),
          points:   parseInt(r.points   || "0", 10),
          baskets:  parseInt(r.baskets  || "0", 10),
          assists:  parseInt(r.assists  || "0", 10),
          rebounds: parseInt(r.rebounds || "0", 10),
          fouls:    parseInt(r.fouls    || "0", 10),
          ...(r.notes.trim() ? { notes: r.notes.trim() } : {}),
        }));
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
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 700 }}>
        <LeaderboardIcon color="primary" />
        Statistiche giocatori
        <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
          — {matchLabel}
        </Typography>
      </DialogTitle>

      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : rows.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography color="text.secondary">
              Nessun convocato per questa partita. Imposta prima i convocati dalla colonna &quot;Convocati&quot;.
            </Typography>
          </Box>
        ) : (
          <Paper elevation={0} variant="outlined" sx={{ overflow: "hidden", mt: 1 }}>
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small" sx={{ minWidth: 620 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: "rgba(0,0,0,0.03)" }}>
                    <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>Giocatore</TableCell>
                    {STAT_COLS.map((col) => (
                      <TableCell
                        key={col.key}
                        align="center"
                        title={col.title}
                        sx={{ fontWeight: 700, fontSize: "0.75rem", minWidth: 56 }}
                      >
                        {col.label}
                      </TableCell>
                    ))}
                    <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", minWidth: 120 }} title="Note (opzionale)">
                      Note
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Avatar src={row.image ?? undefined} sx={{ width: 24, height: 24, fontSize: 10 }}>
                            {row.name[0]}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: "0.82rem" }}>
                              {row.name}
                            </Typography>
                            {row.sportRole && (
                              <Chip
                                label={sportRoleLabel(row.sportRole, row.sportRoleVariant ?? null)}
                                size="small"
                                sx={{ bgcolor: ROLE_COLORS[row.sportRole], color: "#fff", fontWeight: 600, fontSize: "0.55rem", height: 14, mt: 0.2 }}
                              />
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      {STAT_COLS.map((col) => (
                        <TableCell key={col.key} align="center" sx={{ py: 0.5, px: 0.75 }}>
                          <TextField
                            type="number"
                            value={row[col.key]}
                            onChange={(e) => update(row.key, col.key, e.target.value)}
                            size="small"
                            slotProps={{
                              htmlInput: { min: 0, style: { textAlign: "center", padding: "4px 6px", width: 44 } },
                            }}
                            sx={{ "& .MuiOutlinedInput-root": { fontSize: "0.82rem" } }}
                          />
                        </TableCell>
                      ))}
                      <TableCell sx={{ py: 0.5, px: 0.75 }}>
                        <TextField
                          value={row.notes}
                          onChange={(e) => updateNote(row.key, e.target.value)}
                          size="small"
                          placeholder="Opzionale"
                          slotProps={{
                            htmlInput: { maxLength: 500, style: { padding: "4px 8px", fontSize: "0.78rem" } },
                          }}
                          sx={{ width: 140, "& .MuiOutlinedInput-root": { fontSize: "0.78rem" } }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Paper>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>Annulla</Button>
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
