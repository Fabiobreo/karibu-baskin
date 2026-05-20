"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  Alert,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  CircularProgress,
  Paper,
} from "@mui/material";
import UploadIcon from "@mui/icons-material/Upload";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

interface OpposingTeam {
  id: string;
  name: string;
}

interface ParsedRow {
  matchday: number | null;
  date: string | null;
  homeTeamName: string;
  homeTeamId: string | null;
  awayTeamName: string;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  error?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  opponents: OpposingTeam[];
  onImported: (count: number) => void;
}

function normalizeName(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function parseCsv(raw: string, opponents: OpposingTeam[]): ParsedRow[] {
  const nameMap = new Map(opponents.map((o) => [normalizeName(o.name), o]));

  function findOpponent(name: string): { id: string | null; matched: boolean } {
    const norm = normalizeName(name);
    if (nameMap.has(norm)) return { id: nameMap.get(norm)!.id, matched: true };
    // Partial match
    for (const [key, val] of nameMap) {
      if (key.includes(norm) || norm.includes(key)) return { id: val.id, matched: true };
    }
    return { id: null, matched: false };
  }

  return raw
    .trim()
    .split("\n")
    .filter((line) => line.trim())
    .map((line): ParsedRow => {
      // Support both comma and tab separators
      const sep = line.includes("\t") ? "\t" : ",";
      const cols = line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));

      // Expected columns: G. | Data | Casa | Pt Casa | Pt Ospiti | Ospiti
      if (cols.length < 6) {
        return {
          matchday: null,
          date: null,
          homeTeamName: line,
          homeTeamId: null,
          awayTeamName: "",
          awayTeamId: null,
          homeScore: null,
          awayScore: null,
          error: "Colonne insufficienti (servono 6: G, Data, Casa, Pt Casa, Pt Ospiti, Ospiti)",
        };
      }

      const [col0, col1, col2, col3, col4, col5] = cols;

      const matchday = col0 && !isNaN(parseInt(col0)) ? parseInt(col0) : null;
      const date = col1 && col1.match(/\d{4}-\d{2}-\d{2}/) ? col1 : null;
      const homeTeamName = col2;
      const homeScore = col3 !== "" && !isNaN(parseInt(col3)) ? parseInt(col3) : null;
      const awayScore = col4 !== "" && !isNaN(parseInt(col4)) ? parseInt(col4) : null;
      const awayTeamName = col5;

      const home = findOpponent(homeTeamName);
      const away = findOpponent(awayTeamName);

      const errors: string[] = [];
      if (!home.matched) errors.push(`Squadra casa "${homeTeamName}" non trovata`);
      if (!away.matched) errors.push(`Squadra ospiti "${awayTeamName}" non trovata`);

      return {
        matchday,
        date,
        homeTeamName,
        homeTeamId: home.id,
        awayTeamName,
        awayTeamId: away.id,
        homeScore,
        awayScore,
        error: errors.length > 0 ? errors.join("; ") : undefined,
      };
    });
}

export default function GroupCsvImportDialog({
  open,
  onClose,
  groupId,
  groupName,
  opponents,
  onImported,
}: Props) {
  const [csvText, setCsvText] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parsed, setParsed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleParse() {
    if (!csvText.trim()) return;
    const result = parseCsv(csvText, opponents);
    setRows(result);
    setParsed(true);
    setError("");
  }

  function handleReset() {
    setCsvText("");
    setRows([]);
    setParsed(false);
    setError("");
  }

  async function handleImport() {
    const valid = rows.filter((r) => !r.error && r.homeTeamId && r.awayTeamId);
    if (valid.length === 0) {
      setError("Nessuna riga valida da importare.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      let imported = 0;
      for (const row of valid) {
        const res = await fetch(`/api/groups/${groupId}/matches`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matchday: row.matchday,
            date: row.date,
            homeTeamId: row.homeTeamId,
            awayTeamId: row.awayTeamId,
            homeScore: row.homeScore,
            awayScore: row.awayScore,
          }),
        });
        if (res.ok) imported++;
      }
      onImported(imported);
      onClose();
      handleReset();
    } catch {
      setError("Errore di rete durante l'importazione.");
    } finally {
      setSaving(false);
    }
  }

  const validCount = rows.filter((r) => !r.error).length;
  const errorCount = rows.filter((r) => r.error).length;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Importa risultati — {groupName}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!parsed ? (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              Incolla i dati copiati da Excel o Google Sheets. Colonne attese (separatore tab o
              virgola):{" "}
              <strong>G. | Data (AAAA-MM-GG) | Casa | Pt Casa | Pt Ospiti | Ospiti</strong>
            </Alert>
            <Paper
              elevation={0}
              variant="outlined"
              sx={{ p: 1.5, mb: 2, bgcolor: "rgba(0,0,0,0.02)" }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={700}
                sx={{ display: "block", mb: 0.5 }}
              >
                Esempio:
              </Typography>
              <Typography
                variant="caption"
                sx={{ fontFamily: "monospace", whiteSpace: "pre", color: "text.secondary" }}
              >
                {`1\t2025-10-05\tTeam Alfa\t58\t62\tTeam Beta\n1\t2025-10-05\tTeam Gamma\t70\t55\tTeam Delta`}
              </Typography>
            </Paper>
            <TextField
              multiline
              rows={8}
              fullWidth
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={"1\t2025-10-05\tTeam Alfa\t58\t62\tTeam Beta"}
              sx={{ fontFamily: "monospace", fontSize: "0.82rem" }}
            />
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1.5 }}>
              <Button
                variant="contained"
                onClick={handleParse}
                disabled={!csvText.trim()}
                startIcon={<UploadIcon />}
              >
                Analizza
              </Button>
            </Box>
          </Box>
        ) : (
          <Box>
            <Box sx={{ display: "flex", gap: 1.5, mb: 2, flexWrap: "wrap", alignItems: "center" }}>
              {validCount > 0 && (
                <Chip
                  icon={<CheckCircleOutlineIcon />}
                  label={`${validCount} rig${validCount === 1 ? "a" : "he"} valide`}
                  color="success"
                  size="small"
                  sx={{ fontWeight: 700 }}
                />
              )}
              {errorCount > 0 && (
                <Chip
                  icon={<ErrorOutlineIcon />}
                  label={`${errorCount} rig${errorCount === 1 ? "a" : "he"} con errori`}
                  color="error"
                  size="small"
                  sx={{ fontWeight: 700 }}
                />
              )}
              <Button size="small" onClick={handleReset} sx={{ ml: "auto" }}>
                Modifica testo
              </Button>
            </Box>

            <Paper elevation={0} variant="outlined" sx={{ overflow: "hidden" }}>
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: "rgba(0,0,0,0.03)" }}>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem" }}>G.</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem" }}>Data</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem" }}>Casa</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.72rem" }}>
                        Ris.
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem" }}>Ospiti</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem" }}>Stato</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row, i) => (
                      <TableRow
                        key={i}
                        sx={{ bgcolor: row.error ? "rgba(198,40,40,0.04)" : undefined }}
                      >
                        <TableCell sx={{ fontSize: "0.78rem" }}>{row.matchday ?? "—"}</TableCell>
                        <TableCell sx={{ fontSize: "0.78rem" }}>{row.date ?? "—"}</TableCell>
                        <TableCell sx={{ fontSize: "0.78rem", fontWeight: 600 }}>
                          {row.homeTeamName}
                        </TableCell>
                        <TableCell align="center" sx={{ fontSize: "0.78rem", fontWeight: 700 }}>
                          {row.homeScore !== null && row.awayScore !== null
                            ? `${row.homeScore} – ${row.awayScore}`
                            : "—"}
                        </TableCell>
                        <TableCell sx={{ fontSize: "0.78rem", fontWeight: 600 }}>
                          {row.awayTeamName}
                        </TableCell>
                        <TableCell>
                          {row.error ? (
                            <Chip
                              label={row.error}
                              size="small"
                              color="error"
                              sx={{ fontSize: "0.62rem", height: 20 }}
                            />
                          ) : (
                            <Chip
                              label="OK"
                              size="small"
                              color="success"
                              sx={{ fontSize: "0.62rem", height: 20 }}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Paper>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Annulla
        </Button>
        {parsed && validCount > 0 && (
          <Button
            variant="contained"
            onClick={handleImport}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : <UploadIcon />}
          >
            Importa {validCount} partit{validCount === 1 ? "a" : "e"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
