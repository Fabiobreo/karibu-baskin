"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableFooter,
  TextField,
  Avatar,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Breadcrumbs,
  Link as MuiLink,
} from "@mui/material";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ROLE_COLORS, sportRoleLabel } from "@/lib/constants";
import { STAT_FIELDS_BY_ROLE, computePoints, type StatField } from "@/lib/schemas/match";
import { useToast } from "@/context/ToastContext";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";

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
  matchId: string;
  matchLabel: string;
  /** Risultato registrato della partita (null se non ancora inserito) */
  ourScore: number | null;
}

const MVP_MAX = 3;

function mvpKeyFor(row: { userId: string | null; childId: string | null }): string {
  return row.userId ? `user-${row.userId}` : `child-${row.childId}`;
}

export default function MatchStatsClient({ matchId, matchLabel, ourScore }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const { openConfirm, ConfirmDialog } = useConfirmDialog();
  const [rows, setRows] = useState<StatRow[]>([]);
  const [mvpKeys, setMvpKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Modifiche non salvate → prompt su refresh/chiusura + conferma su Annulla
  const [dirty, setDirty] = useState(false);
  useUnsavedChangesGuard(dirty);

  function handleCancel() {
    if (!dirty) {
      router.push("/admin/partite");
      return;
    }
    openConfirm(
      "Modifiche non salvate",
      "Hai modifiche non salvate alle statistiche. Uscire senza salvare?",
      () => router.push("/admin/partite"),
      { confirmLabel: "Esci senza salvare", confirmColor: "error" }
    );
  }

  function toggleMvp(key: string) {
    if (!mvpKeys.has(key) && mvpKeys.size >= MVP_MAX) {
      showToast({ message: `Massimo ${MVP_MAX} MVP per partita`, severity: "warning" });
      return;
    }
    setDirty(true);
    setMvpKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError("");

    setLoading(true);

    Promise.all([
      fetch(`/api/matches/${matchId}/callups`).then((r) => r.json()),
      fetch(`/api/matches/${matchId}/stats`).then((r) => r.json()),
      fetch(`/api/matches/${matchId}/mvps`).then((r) => r.json()),
    ])
      .then(
        ([callups, existingStats, mvps]: [
          CalledPlayer[],
          ExistingStat[],
          Array<{ userId: string | null; childId: string | null }>,
        ]) => {
          const initialMvps = new Set<string>(mvps.map((m) => mvpKeyFor(m)));
          setMvpKeys(initialMvps);
          return [callups, existingStats] as const;
        }
      )
      .then(([callups, existingStats]) => {
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
  }, [matchId]);

  function update(key: string, field: StatField, value: string) {
    setDirty(true);
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  function updateNote(key: string, value: string) {
    setDirty(true);
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

      // Salva MVPs
      const mvpUserIds: string[] = [];
      const mvpChildIds: string[] = [];
      for (const key of mvpKeys) {
        if (key.startsWith("user-")) mvpUserIds.push(key.slice(5));
        else if (key.startsWith("child-")) mvpChildIds.push(key.slice(6));
      }
      const mvpRes = await fetch(`/api/matches/${matchId}/mvps`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: mvpUserIds, childIds: mvpChildIds }),
      });
      if (!mvpRes.ok) {
        const data = (await mvpRes.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Errore nel salvataggio degli MVP");
        return;
      }

      showToast({ message: "Statistiche e MVP salvati", severity: "success" });
      setDirty(false);
      router.push("/admin/partite");
      router.refresh();
    } catch {
      setError("Errore di rete");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <MuiLink
            component={Link}
            href="/admin"
            underline="hover"
            color="text.secondary"
            variant="body2"
          >
            Dashboard
          </MuiLink>
          <MuiLink
            component={Link}
            href="/admin/partite"
            underline="hover"
            color="text.secondary"
            variant="body2"
          >
            Partite
          </MuiLink>
          <Typography variant="body2" color="text.primary">
            Statistiche
          </Typography>
        </Breadcrumbs>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <LeaderboardIcon color="primary" />
          <Typography variant="h4" fontWeight={800}>
            Statistiche giocatori
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {matchLabel}
        </Typography>
      </Box>

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
        <Paper elevation={0} variant="outlined" sx={{ textAlign: "center", py: 6, px: 3 }}>
          <Typography color="text.secondary" sx={{ mb: 1 }}>
            Nessun convocato per questa partita.
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mb: 2 }}>
            Imposta prima i convocati dalla pagina &quot;Convocati&quot;.
          </Typography>
          <Link href={`/admin/partite/${matchId}/convocazioni`} style={{ textDecoration: "none" }}>
            <Button variant="outlined">Vai a Convocazioni</Button>
          </Link>
        </Paper>
      ) : (
        <>
          {/* MVP picker — max 3 dai convocati */}
          <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <EmojiEventsIcon sx={{ color: "#F9A825" }} />
              <Typography variant="subtitle1" fontWeight={700}>
                MVP della partita
              </Typography>
              <Chip
                label={`${mvpKeys.size} / ${MVP_MAX}`}
                size="small"
                sx={{
                  fontWeight: 700,
                  bgcolor: mvpKeys.size > 0 ? "rgba(249,168,37,0.15)" : "action.hover",
                  color: mvpKeys.size > 0 ? "match.draw" : "text.secondary",
                }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
              Seleziona fino a {MVP_MAX} giocatori MVP. Verranno salvati insieme alle statistiche.
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
              {rows.map((row) => {
                const key = mvpKeyFor(row);
                const selected = mvpKeys.has(key);
                return (
                  <Chip
                    key={key}
                    label={row.name}
                    onClick={() => toggleMvp(key)}
                    icon={
                      selected ? (
                        <EmojiEventsIcon sx={{ fontSize: "16px !important", color: "#fff" }} />
                      ) : undefined
                    }
                    sx={{
                      fontWeight: 700,
                      cursor: "pointer",
                      bgcolor: selected ? "#F9A825" : "transparent",
                      color: selected ? "#fff" : "text.primary",
                      border: "1px solid",
                      borderColor: selected ? "#F9A825" : "divider",
                      "&:hover": {
                        bgcolor: selected ? "#F57F17" : "rgba(249,168,37,0.08)",
                      },
                    }}
                  />
                );
              })}
            </Box>
          </Paper>

          <Paper elevation={0} variant="outlined" sx={{ overflow: "hidden" }}>
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small" sx={{ minWidth: 760 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: "action.hover" }}>
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
                                  // Evita modifiche accidentali con la rotella del mouse
                                  onWheel={(e) => (e.target as HTMLElement).blur()}
                                  slotProps={{
                                    htmlInput: {
                                      min: 0,
                                      inputMode: "numeric",
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
                  <TableRow sx={{ bgcolor: "action.hover" }}>
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

          {/* Riconciliazione col risultato registrato */}
          {ourScore !== null && (
            <Alert
              severity={totals.points === ourScore ? "success" : "warning"}
              sx={{ mt: 2 }}
              icon={totals.points === ourScore ? undefined : <WarningAmberIcon />}
            >
              {totals.points === ourScore
                ? `Totale statistiche (${totals.points} pt) coerente con il risultato registrato.`
                : `Totale statistiche ${totals.points} pt ≠ risultato registrato ${ourScore} pt. Controlla i valori prima di salvare.`}
            </Alert>
          )}
        </>
      )}

      {!loading && rows.length > 0 && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5, mt: 3 }}>
          <Button onClick={handleCancel} disabled={saving}>
            Annulla
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : undefined}
          >
            Salva statistiche
          </Button>
        </Box>
      )}

      {ConfirmDialog}
    </Box>
  );
}
