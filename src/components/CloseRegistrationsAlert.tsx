"use client";
import { useState } from "react";
import { Alert, Button, Box, Typography, CircularProgress } from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import { useToast } from "@/context/ToastContext";

interface Props {
  sessionId: string;
  onClosed?: () => void;
}

export default function CloseRegistrationsAlert({ sessionId, onClosed }: Props) {
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const { showToast } = useToast();

  async function handleClose() {
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/close-registrations`, { method: "POST" });
      if (res.ok) {
        showToast({ message: "Iscrizioni chiuse — notifica inviata", severity: "success" });
        onClosed?.();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast({ message: data.error ?? "Errore nella chiusura", severity: "error" });
      }
    } catch {
      showToast({ message: "Errore di rete, riprova", severity: "error" });
    } finally {
      setLoading(false);
      setConfirm(false);
    }
  }

  return (
    <Alert
      severity="info"
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
            Iscrizioni aperte
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Chiudi quando il roster è completo. Verrà inviata una notifica.
          </Typography>
        </Box>
        {confirm ? (
          <Box sx={{ display: "flex", gap: 0.5, flexShrink: 0 }}>
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              disabled={loading}
              onClick={() => setConfirm(false)}
            >
              Annulla
            </Button>
            <Button
              size="small"
              variant="contained"
              color="error"
              disabled={loading}
              startIcon={
                loading ? <CircularProgress size={14} color="inherit" /> : <LockIcon />
              }
              onClick={handleClose}
            >
              {loading ? "Chiusura..." : "Conferma"}
            </Button>
          </Box>
        ) : (
          <Button
            onClick={() => setConfirm(true)}
            variant="outlined"
            color="inherit"
            size="small"
            startIcon={<LockIcon />}
            sx={{ fontWeight: 600, flexShrink: 0 }}
          >
            Chiudi iscrizioni
          </Button>
        )}
      </Box>
    </Alert>
  );
}
