"use client";
import { useState } from "react";
import {
  Box,
  TextField,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  CircularProgress,
} from "@mui/material";
import { ROLE_LABELS, ROLE_COLORS, ROLES } from "@/lib/constants";
import { useToast } from "@/context/ToastContext";

interface Props {
  sessionId: string;
  onRegistered: () => void;
  registeredNames: string[];
}

export default function RegistrationForm({ sessionId, onRegistered, registeredNames }: Props) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const isDuplicate =
    name.trim().length > 0 &&
    registeredNames.some((n) => n.toLowerCase() === name.trim().toLowerCase());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !role) {
      showToast({ message: "Inserisci il tuo nome e seleziona il ruolo", severity: "warning" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, name: name.trim(), role }),
      });

      if (res.status === 409) {
        showToast({ message: "Sei già iscritto a questo allenamento", severity: "error" });
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        showToast({ message: data.error ?? "Errore durante l'iscrizione", severity: "error" });
        return;
      }

      showToast({ message: `✅ ${name.trim()} iscritto/a con successo!`, severity: "success" });
      setName("");
      setRole(null);
      onRegistered();
    } catch {
      showToast({ message: "Errore di rete, riprova", severity: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Typography variant="h6" gutterBottom>
        Iscriviti all&apos;allenamento
      </Typography>

      <TextField
        label="Il tuo nome"
        value={name}
        onChange={(e) => setName(e.target.value)}
        fullWidth
        size="small"
        inputProps={{ maxLength: 60 }}
        sx={{ mb: 2 }}
        disabled={loading}
        error={isDuplicate}
        helperText={isDuplicate ? "Questo atleta è già iscritto" : ""}
      />

      <Typography variant="body2" color="text.secondary" gutterBottom>
        Seleziona il tuo ruolo:
      </Typography>
      <ToggleButtonGroup
        value={role}
        exclusive
        onChange={(_, val) => val !== null && setRole(val)}
        sx={{ mb: 2.5, flexWrap: "wrap", gap: 0.5 }}
      >
        {ROLES.map((r) => (
          <ToggleButton
            key={r}
            value={r}
            size="small"
            sx={{
              fontWeight: 600,
              fontSize: "0.75rem",
              py: 0.5,
              px: 1.5,
              borderRadius: "6px !important",
              border: "1px solid rgba(0,0,0,0.23) !important",
              "&.Mui-selected": {
                backgroundColor: ROLE_COLORS[r],
                color: "#fff",
                borderColor: `${ROLE_COLORS[r]} !important`,
                "&:hover": { backgroundColor: ROLE_COLORS[r], opacity: 0.9 },
              },
            }}
          >
            {ROLE_LABELS[r]}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <Button
        type="submit"
        variant="contained"
        fullWidth
        disabled={loading || !name.trim() || !role || isDuplicate}
        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
      >
        {loading ? "Iscrizione in corso..." : "Iscriviti"}
      </Button>
    </Box>
  );
}
