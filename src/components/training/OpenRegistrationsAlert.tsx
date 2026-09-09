"use client";
import { useState } from "react";
import { Alert, Button, Box, Typography, CircularProgress } from "@mui/material";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import { useToast } from "@/context/ToastContext";

interface Props {
  sessionId: string;
  onOpened?: () => void;
}

export default function OpenRegistrationsAlert({ sessionId, onOpened }: Props) {
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  async function handleOpen() {
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/open-registrations`, { method: "POST" });
      if (res.ok) {
        showToast({ message: "Iscrizioni aperte (notifica inviata)", severity: "success" });
        onOpened?.();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast({ message: data.error ?? "Errore nell'apertura", severity: "error" });
      }
    } catch {
      showToast({ message: "Errore di rete, riprova", severity: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Alert
      severity="warning"
      icon={false}
      sx={{
        mb: 2,
        "& .MuiAlert-message": { width: "100%" },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 1.5,
          flexDirection: "column",
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" fontWeight={700}>
            Iscrizioni non ancora aperte
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Apri quando vuoi inviare la notifica e permettere le iscrizioni.
          </Typography>
        </Box>
        <Button
          onClick={handleOpen}
          disabled={loading}
          variant="contained"
          color="warning"
          size="small"
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <LockOpenIcon />}
          sx={{ fontWeight: 700, flexShrink: 0 }}
        >
          {loading ? "Apertura..." : "Apri iscrizioni"}
        </Button>
      </Box>
    </Alert>
  );
}
