"use client";
import { useState } from "react";
import {
  Box, TextField, Button, Typography, CircularProgress, Divider, Alert,
} from "@mui/material";
import BugReportIcon from "@mui/icons-material/BugReport";

export default function TestLoginForm({ callbackUrl = "/" }: { callbackUrl?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/test-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        // Sessione creata — redirect manuale per ricaricare il contesto auth
        window.location.href = callbackUrl;
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Errore durante il login");
      }
    } catch {
      setError("Errore di rete, riprova");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Divider sx={{ mb: 2.5 }}>
        <Typography variant="caption" color="text.disabled" sx={{ px: 1 }}>
          oppure
        </Typography>
      </Divider>

      <Alert
        icon={<BugReportIcon fontSize="inherit" />}
        severity="warning"
        variant="outlined"
        sx={{ mb: 2, fontSize: "0.75rem", py: 0.5 }}
      >
        Modalità test — non disponibile in produzione
      </Alert>

      <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        <TextField
          label="Email utente"
          type="email"
          size="small"
          fullWidth
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          required
          autoComplete="off"
        />
        <TextField
          label="Password test"
          type="password"
          size="small"
          fullWidth
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          required
          autoComplete="off"
        />
        {error && (
          <Typography variant="caption" color="error">
            {error}
          </Typography>
        )}
        <Button
          type="submit"
          variant="outlined"
          color="warning"
          fullWidth
          disabled={loading || !email || !password}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <BugReportIcon />}
          sx={{ textTransform: "none", fontWeight: 600 }}
        >
          {loading ? "Accesso in corso..." : "Accedi (test)"}
        </Button>
      </Box>
    </Box>
  );
}
