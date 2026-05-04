"use client";
import { useEffect, useState } from "react";
import {
  Box, Typography, Paper, TextField, Button,
  Select, MenuItem, FormControl, InputLabel, Chip,
  Alert, CircularProgress, Divider,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import { ROLE_LABELS, ROLE_COLORS, ROLES } from "@/lib/constants";
import { useToast } from "@/context/ToastContext";

interface Team {
  id: string;
  name: string;
  season: string;
  color: string | null;
}

export default function AdminNotificationSender({ currentSeason }: { currentSeason: string }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [teamId, setTeamId] = useState<string>("");
  const [sportRole, setSportRole] = useState<string>("");  // "" = nessun filtro
  const [targetAll, setTargetAll] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const { showToast } = useToast();

  useEffect(() => {
    fetch("/api/competitive-teams")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Team[]) => setTeams(data.filter((t) => t.season === currentSeason)))
      .catch(() => {});
  }, [currentSeason]);

  const hasTarget = targetAll || !!teamId || !!sportRole;

  function audienceDescription(): string {
    if (targetAll) return "Tutti i subscriber";
    const parts: string[] = [];
    if (teamId) {
      const t = teams.find((t) => t.id === teamId);
      parts.push(t ? `squadra ${t.name}` : "squadra selezionata");
    }
    if (sportRole) {
      parts.push(`Ruolo ${sportRole}`);
    }
    if (parts.length === 0) return "Nessun destinatario selezionato";
    return parts.join(" + ");
  }

  async function handleSend() {
    if (!title.trim()) { setError("Il titolo è obbligatorio"); return; }
    if (!body.trim())  { setError("Il messaggio è obbligatorio"); return; }
    if (!hasTarget)    { setError("Seleziona almeno un destinatario"); return; }

    setSending(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        body: body.trim(),
        ...(url.trim() ? { url: url.trim() } : {}),
        ...(targetAll ? { targetAll: true } : {}),
        ...(teamId ? { teamId } : {}),
        ...(sportRole ? { sportRole: parseInt(sportRole, 10) } : {}),
      };
      const res = await fetch("/api/push/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json() as { sent: number };
        showToast({ message: `Notifica inviata a ${data.sent} dispositiv${data.sent !== 1 ? "i" : "o"}`, severity: "success" });
        setTitle(""); setBody(""); setUrl(""); setTeamId(""); setSportRole(""); setTargetAll(false);
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setError(data.error ?? "Errore durante l'invio");
      }
    } catch {
      setError("Errore di rete, riprova");
    } finally {
      setSending(false);
    }
  }

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2.5 }}>
        <NotificationsActiveIcon fontSize="small" color="action" />
        <Typography variant="subtitle1" fontWeight={700}>
          Invia notifica push
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField
          label="Titolo"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setError(""); }}
          size="small"
          fullWidth
          inputProps={{ maxLength: 100 }}
          disabled={sending}
        />
        <TextField
          label="Messaggio"
          value={body}
          onChange={(e) => { setBody(e.target.value); setError(""); }}
          size="small"
          fullWidth
          multiline
          rows={2}
          inputProps={{ maxLength: 300 }}
          disabled={sending}
        />
        <TextField
          label="URL di destinazione (opzionale)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          size="small"
          fullWidth
          placeholder="es. /allenamenti"
          disabled={sending}
        />

        <Divider />

        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
          Destinatari
        </Typography>

        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
          {/* Tutti */}
          <Chip
            label="Tutti"
            onClick={() => { setTargetAll(!targetAll); setTeamId(""); setSportRole(""); setError(""); }}
            color={targetAll ? "primary" : "default"}
            variant={targetAll ? "filled" : "outlined"}
            sx={{ fontWeight: 600 }}
          />

          {/* Per squadra */}
          <FormControl size="small" sx={{ minWidth: 160 }} disabled={targetAll || sending}>
            <InputLabel shrink>Squadra</InputLabel>
            <Select
              value={teamId}
              label="Squadra"
              notched
              displayEmpty
              onChange={(e) => { setTeamId(e.target.value); setTargetAll(false); setError(""); }}
            >
              <MenuItem value=""><em>Tutte le squadre</em></MenuItem>
              {teams.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {t.color && (
                      <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: t.color, flexShrink: 0 }} />
                    )}
                    {t.name}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Per ruolo */}
          <FormControl size="small" sx={{ minWidth: 130 }} disabled={targetAll || sending}>
            <InputLabel shrink>Ruolo Baskin</InputLabel>
            <Select
              value={sportRole}
              label="Ruolo Baskin"
              notched
              displayEmpty
              onChange={(e) => { setSportRole(e.target.value); setTargetAll(false); setError(""); }}
            >
              <MenuItem value=""><em>Tutti i ruoli</em></MenuItem>
              {ROLES.map((r) => (
                <MenuItem key={r} value={String(r)}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: ROLE_COLORS[r], flexShrink: 0 }} />
                    {ROLE_LABELS[r]}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Preview destinatari */}
        <Typography variant="caption" color={hasTarget ? "primary.main" : "text.disabled"} fontWeight={600}>
          → {audienceDescription()}
        </Typography>

        <Button
          variant="contained"
          onClick={handleSend}
          disabled={sending || !hasTarget}
          startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
          sx={{ alignSelf: "flex-start", px: 3 }}
        >
          {sending ? "Invio in corso..." : "Invia notifica"}
        </Button>
      </Box>
    </Paper>
  );
}
