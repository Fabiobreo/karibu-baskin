"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        setError("Password non valida");
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("Errore di rete, riprova");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxWidth="xs" sx={{ pt: 10 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: "center" }}>
        <LockIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
        <Typography variant="h5" gutterBottom fontWeight={700}>
          Area Admin
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Karibu Baskin Montecchio Maggiore
        </Typography>

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            size="small"
            sx={{ mb: 2 }}
            disabled={loading}
            autoFocus
          />

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading || !password}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {loading ? "Accesso..." : "Accedi"}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
