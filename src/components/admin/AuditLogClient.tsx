"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  TablePagination,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Stack,
  Paper,
  CircularProgress,
  Tooltip,
  Alert,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import FilterListIcon from "@mui/icons-material/FilterList";
import ClearIcon from "@mui/icons-material/Clear";
import type { AppRole } from "@prisma/client";
import { ROLE_LABELS_IT } from "@/lib/constants";

// ── Tipi ─────────────────────────────────────────────────────────────────────

interface AuditActor {
  id: string;
  name: string | null;
  email: string | null;
  appRole: AppRole;
}

interface AuditItem {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
  actor: AuditActor | null;
  targetLabel: string | null;
}

interface AuditResponse {
  items: AuditItem[];
  total: number;
  page: number;
  pageSize: number;
}

// ── Labels azione ─────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  UPDATE_ROLE: "Modifica ruolo utente",
  UPDATE_SPORT_ROLE: "Modifica ruolo Baskin",
  DELETE_USER: "Eliminazione utente",
  DELETE_CHILD: "Eliminazione figlio",
  ADD_MEMBER: "Aggiunta membro squadra",
  REMOVE_MEMBER: "Rimozione membro squadra",
  CREATE_TEAM: "Creazione squadra",
  UPDATE_TEAM: "Modifica squadra",
  DELETE_TEAM: "Eliminazione squadra",
  CREATE_MATCH: "Creazione partita",
  UPDATE_MATCH: "Modifica partita",
  DELETE_MATCH: "Eliminazione partita",
  CREATE_EVENT: "Creazione evento",
  UPDATE_EVENT: "Modifica evento",
  DELETE_EVENT: "Eliminazione evento",
  LINK_ACCEPTED: "Collegamento genitore-figlio accettato",
  LINK_REJECTED: "Collegamento genitore-figlio rifiutato",
  EXPORT_PII: "Esportazione dati personali (CSV)",
  DELETE_ANONYMOUS_REGS: "Eliminazione iscrizioni anonime",
  CREATE_SESSION: "Creazione allenamento",
  UPDATE_SESSION: "Modifica allenamento",
  DELETE_SESSION: "Eliminazione allenamento",
  CONCLUDE_SESSION: "Conclusione allenamento",
  GENERATE_TEAMS: "Generazione squadre allenamento",
  UPDATE_TEAMS: "Modifica manuale squadre",
  DELETE_TEAMS: "Reset squadre allenamento",
  CREATE_TRAINING_MATCH_RESULT: "Risultato partitella registrato",
  UPDATE_CALLUPS: "Aggiornamento convocazioni",
  UPDATE_MATCH_STATS: "Aggiornamento statistiche partita",
  CREATE_GROUP: "Creazione girone",
  UPDATE_GROUP: "Modifica girone",
  DELETE_GROUP: "Eliminazione girone",
  CREATE_OPPOSING_TEAM: "Creazione squadra avversaria",
  UPDATE_OPPOSING_TEAM: "Modifica squadra avversaria",
  DELETE_OPPOSING_TEAM: "Eliminazione squadra avversaria",
  DELETE_REGISTRATION: "Eliminazione iscrizione (staff)",
};

const ACTION_COLORS: Record<string, "default" | "error" | "warning" | "success" | "info"> = {
  UPDATE_ROLE: "info",
  UPDATE_SPORT_ROLE: "info",
  DELETE_USER: "error",
  DELETE_CHILD: "error",
  DELETE_TEAM: "error",
  DELETE_MATCH: "error",
  DELETE_EVENT: "error",
  ADD_MEMBER: "success",
  REMOVE_MEMBER: "warning",
  CREATE_TEAM: "success",
  UPDATE_TEAM: "info",
  CREATE_MATCH: "success",
  UPDATE_MATCH: "info",
  CREATE_EVENT: "success",
  UPDATE_EVENT: "info",
  LINK_ACCEPTED: "success",
  LINK_REJECTED: "warning",
  EXPORT_PII: "warning",
  DELETE_ANONYMOUS_REGS: "error",
  CREATE_SESSION: "success",
  UPDATE_SESSION: "info",
  DELETE_SESSION: "error",
  CONCLUDE_SESSION: "info",
  GENERATE_TEAMS: "success",
  UPDATE_TEAMS: "info",
  DELETE_TEAMS: "warning",
  CREATE_TRAINING_MATCH_RESULT: "success",
  UPDATE_CALLUPS: "info",
  UPDATE_MATCH_STATS: "info",
  CREATE_GROUP: "success",
  UPDATE_GROUP: "info",
  DELETE_GROUP: "error",
  CREATE_OPPOSING_TEAM: "success",
  UPDATE_OPPOSING_TEAM: "info",
  DELETE_OPPOSING_TEAM: "error",
  DELETE_REGISTRATION: "warning",
};

const TARGET_TYPE_LABELS: Record<string, string> = {
  User: "Utente",
  Child: "Figlio",
  CompetitiveTeam: "Squadra",
  TeamMembership: "Membro squadra",
  Match: "Partita",
  Event: "Evento",
  Registration: "Iscrizione",
  TrainingSession: "Allenamento",
  Group: "Girone",
  OpposingTeam: "Squadra avversaria",
};

const ALL_ACTIONS = Object.keys(ACTION_LABELS);
const ALL_TARGET_TYPES = Object.keys(TARGET_TYPE_LABELS);

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function JsonDiff({
  before,
  after,
}: {
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}) {
  if (!before && !after)
    return (
      <Typography variant="body2" color="text.secondary">
        Nessun dettaglio disponibile.
      </Typography>
    );

  const allKeys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])];

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
      <Box>
        <Typography
          variant="caption"
          color="text.secondary"
          fontWeight={700}
          sx={{ mb: 0.5, display: "block" }}
        >
          Prima
        </Typography>
        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            fontFamily: "monospace",
            fontSize: "0.78rem",
            wordBreak: "break-all",
            minHeight: 60,
          }}
        >
          {before ? (
            allKeys.map((k) => (
              <Box
                key={k}
                sx={{
                  color:
                    after && JSON.stringify(before[k]) !== JSON.stringify(after?.[k])
                      ? "warning.dark"
                      : "text.primary",
                }}
              >
                <strong>{k}:</strong> {JSON.stringify(before[k])}
              </Box>
            ))
          ) : (
            <Typography variant="caption" color="text.secondary">
              —
            </Typography>
          )}
        </Paper>
      </Box>
      <Box>
        <Typography
          variant="caption"
          color="text.secondary"
          fontWeight={700}
          sx={{ mb: 0.5, display: "block" }}
        >
          Dopo
        </Typography>
        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            fontFamily: "monospace",
            fontSize: "0.78rem",
            wordBreak: "break-all",
            minHeight: 60,
          }}
        >
          {after ? (
            allKeys.map((k) => (
              <Box
                key={k}
                sx={{
                  color:
                    before && JSON.stringify(before?.[k]) !== JSON.stringify(after[k])
                      ? "success.dark"
                      : "text.primary",
                }}
              >
                <strong>{k}:</strong> {JSON.stringify(after[k])}
              </Box>
            ))
          ) : (
            <Typography variant="caption" color="text.secondary">
              —
            </Typography>
          )}
        </Paper>
      </Box>
    </Box>
  );
}

// ── Componente principale ─────────────────────────────────────────────────────

export default function AuditLogClient() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtri
  const [action, setAction] = useState("");
  const [targetType, setTargetType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  // Dialog dettagli
  const [detail, setDetail] = useState<AuditItem | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page + 1),
        pageSize: String(pageSize),
        ...(action ? { action } : {}),
        ...(targetType ? { targetType } : {}),
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
      });
      const res = await fetch(`/api/admin/audit?${params}`);
      if (!res.ok) throw new Error("Errore nel caricamento dei dati.");
      setData(await res.json());
    } catch {
      setError("Impossibile caricare il registro. Riprova.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, action, targetType, from, to]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function resetFilters() {
    setAction("");
    setTargetType("");
    setFrom("");
    setTo("");
    setPage(0);
  }

  const hasFilters = action || targetType || from || to;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* Filtri */}
      <Paper elevation={1} sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" gap={1} mb={1.5}>
          <FilterListIcon fontSize="small" color="action" />
          <Typography variant="subtitle2" fontWeight={700}>
            Filtri
          </Typography>
          {hasFilters && (
            <Button
              size="small"
              startIcon={<ClearIcon />}
              onClick={resetFilters}
              sx={{ ml: "auto" }}
            >
              Azzera
            </Button>
          )}
        </Stack>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr 1fr", md: "1fr 1fr 1fr 1fr" },
            gap: 2,
          }}
        >
          <FormControl size="small" fullWidth>
            <InputLabel>Azione</InputLabel>
            <Select
              value={action}
              label="Azione"
              onChange={(e) => {
                setAction(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">
                <em>Tutte</em>
              </MenuItem>
              {ALL_ACTIONS.map((a) => (
                <MenuItem key={a} value={a}>
                  {ACTION_LABELS[a] ?? a}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel>Tipo target</InputLabel>
            <Select
              value={targetType}
              label="Tipo target"
              onChange={(e) => {
                setTargetType(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">
                <em>Tutti</em>
              </MenuItem>
              {ALL_TARGET_TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {TARGET_TYPE_LABELS[t] ?? t}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            size="small"
            label="Da"
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(0);
            }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            size="small"
            label="A"
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(0);
            }}
            InputLabelProps={{ shrink: true }}
          />
        </Box>
      </Paper>

      {/* Tabella */}
      <Paper elevation={2}>
        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        )}

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && !error && data && !isMobile && (
          <>
            <TableContainer sx={{ overflowX: "auto" }}>
              <Table size="small" sx={{ minWidth: 720 }}>
                <TableHead>
                  <TableRow sx={{ "& th": { fontWeight: 700, bgcolor: "action.hover" } }}>
                    <TableCell>Data</TableCell>
                    <TableCell>Attore</TableCell>
                    <TableCell>Azione</TableCell>
                    <TableCell>Target</TableCell>
                    <TableCell align="center">Dettagli</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4, color: "text.secondary" }}>
                        Nessun evento trovato.
                      </TableCell>
                    </TableRow>
                  )}
                  {data.items.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Typography variant="caption">{formatDate(item.createdAt)}</Typography>
                      </TableCell>
                      <TableCell>
                        {item.actor ? (
                          <Box>
                            <Typography variant="body2" fontWeight={600} lineHeight={1.2}>
                              {item.actor.name ?? "—"}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {item.actor.email} · {ROLE_LABELS_IT[item.actor.appRole]}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            ID: {item.actorId.slice(0, 8)}…
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={ACTION_LABELS[item.action] ?? item.action}
                          color={ACTION_COLORS[item.action] ?? "default"}
                          size="small"
                          sx={{ fontSize: "0.7rem" }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          fontWeight={item.targetLabel ? 600 : 400}
                          sx={{ wordBreak: "break-word" }}
                        >
                          {item.targetLabel ?? (
                            <em style={{ fontWeight: 400, color: "inherit" }}>eliminato</em>
                          )}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {TARGET_TYPE_LABELS[item.targetType] ?? item.targetType}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Vedi dettagli">
                          <IconButton
                            size="small"
                            onClick={() => setDetail(item)}
                            aria-label="Vedi dettagli"
                          >
                            <InfoOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={data.total}
              page={page}
              rowsPerPage={pageSize}
              rowsPerPageOptions={[10, 25, 50, 100]}
              onPageChange={(_, p) => setPage(p)}
              onRowsPerPageChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setPage(0);
              }}
              labelRowsPerPage="Righe:"
              labelDisplayedRows={({ from: f, to: t, count }) => `${f}–${t} di ${count}`}
            />
          </>
        )}

        {!loading && !error && data && isMobile && (
          <>
            <Stack divider={<Box sx={{ borderTop: 1, borderColor: "divider" }} />}>
              {data.items.length === 0 && (
                <Box sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>
                  <Typography variant="body2">Nessun evento trovato.</Typography>
                </Box>
              )}
              {data.items.map((item) => (
                <Box
                  key={item.id}
                  onClick={() => setDetail(item)}
                  sx={{
                    p: 1.5,
                    cursor: "pointer",
                    "&:hover": { bgcolor: "action.hover" },
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.5,
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                    <Chip
                      label={ACTION_LABELS[item.action] ?? item.action}
                      color={ACTION_COLORS[item.action] ?? "default"}
                      size="small"
                      sx={{ fontSize: "0.68rem", maxWidth: "100%" }}
                    />
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ whiteSpace: "nowrap" }}
                    >
                      {formatDate(item.createdAt)}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" fontWeight={600} sx={{ wordBreak: "break-word" }}>
                    {item.targetLabel ?? (
                      <em style={{ fontWeight: 400, color: "inherit" }}>eliminato</em>
                    )}{" "}
                    <Typography component="span" variant="caption" color="text.secondary">
                      ({TARGET_TYPE_LABELS[item.targetType] ?? item.targetType})
                    </Typography>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.actor?.name ?? item.actor?.email ?? "—"}
                    {item.actor?.appRole && ` · ${ROLE_LABELS_IT[item.actor.appRole]}`}
                  </Typography>
                </Box>
              ))}
            </Stack>
            <TablePagination
              component="div"
              count={data.total}
              page={page}
              rowsPerPage={pageSize}
              rowsPerPageOptions={[10, 25, 50, 100]}
              onPageChange={(_, p) => setPage(p)}
              onRowsPerPageChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setPage(0);
              }}
              labelRowsPerPage="Righe:"
              labelDisplayedRows={({ from: f, to: t, count }) => `${f}–${t} di ${count}`}
            />
          </>
        )}
      </Paper>

      {/* Dialog dettagli */}
      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="md" fullWidth>
        {detail && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Stack direction="row" alignItems="center" gap={1}>
                <Chip
                  label={ACTION_LABELS[detail.action] ?? detail.action}
                  color={ACTION_COLORS[detail.action] ?? "default"}
                  size="small"
                />
                <Typography variant="caption" color="text.secondary">
                  {formatDate(detail.createdAt)}
                </Typography>
              </Stack>
            </DialogTitle>
            <DialogContent dividers>
              <Stack gap={2}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                    gap: 1,
                  }}
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Attore
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {detail.actor?.name ?? "—"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {detail.actor?.email ?? detail.actorId}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Target
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {detail.targetLabel ?? <em>eliminato</em>}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {TARGET_TYPE_LABELS[detail.targetType] ?? detail.targetType}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontFamily: "monospace", display: "block" }}
                    >
                      {detail.targetId}
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} mb={1}>
                    Modifiche
                  </Typography>
                  <JsonDiff before={detail.before} after={detail.after} />
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetail(null)}>Chiudi</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
