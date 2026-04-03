"use client";
import { useState } from "react";
import {
  Box, Typography, Paper, TextField, Select, MenuItem,
  Button, Stack, Divider, FormControl, InputLabel, Chip, Alert,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AppRole, Gender } from "@prisma/client";
import { ROLE_LABELS_IT, ROLE_CHIP_COLORS } from "@/lib/authRoles";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/constants";

export default function NuovoUtentePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    email: "",
    name: "",
    appRole: "GUEST" as AppRole,
    sportRole: "" as string,
    gender: "" as string,
    birthDate: "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.email,
        name: form.name || null,
        appRole: form.appRole,
        sportRole: form.sportRole ? parseInt(form.sportRole) : null,
        gender: form.gender || null,
        birthDate: form.birthDate || null,
      }),
    });

    setSaving(false);
    if (res.ok) {
      router.push("/admin/utenti");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Errore durante la creazione");
    }
  }

  return (
    <Box>
      <Button
        href="/admin/utenti"
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 2 }}
        size="small"
      >
        Torna agli utenti
      </Button>

      <Typography variant="h5" fontWeight={700} gutterBottom>
        Nuovo utente
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        L&apos;utente potrà accedere con Google usando la stessa email — l&apos;account si collegherà automaticamente.
      </Typography>

      <Paper elevation={2} sx={{ p: { xs: 2, md: 3 }, maxWidth: 520 }}>
        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                Dati di accesso
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="Email *"
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  required
                  fullWidth
                  size="small"
                  placeholder="mario.rossi@email.com"
                />
                <TextField
                  label="Nome completo"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="Mario Rossi"
                  helperText="Verrà aggiornato automaticamente al primo login con Google"
                />
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                Ruoli e permessi
              </Typography>
              <Stack spacing={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Ruolo utente</InputLabel>
                  <Select
                    label="Ruolo utente"
                    value={form.appRole}
                    onChange={(e) => set("appRole", e.target.value)}
                    renderValue={(val) => (
                      <Chip label={ROLE_LABELS_IT[val as AppRole]} size="small" color={ROLE_CHIP_COLORS[val as AppRole]} sx={{ fontWeight: 600 }} />
                    )}
                  >
                    {(["GUEST", "ATHLETE", "PARENT", "COACH", "ADMIN"] as AppRole[]).map((r) => (
                      <MenuItem key={r} value={r}>
                        <Chip label={ROLE_LABELS_IT[r]} size="small" color={ROLE_CHIP_COLORS[r]} sx={{ fontWeight: 600 }} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth size="small">
                  <InputLabel shrink>Ruolo Baskin</InputLabel>
                  <Select
                    label="Ruolo Baskin"
                    displayEmpty
                    notched
                    value={form.sportRole}
                    onChange={(e) => set("sportRole", e.target.value)}
                    renderValue={(val) =>
                      val ? (
                        <Chip
                          label={ROLE_LABELS[parseInt(val) as keyof typeof ROLE_LABELS]}
                          size="small"
                          sx={{ bgcolor: ROLE_COLORS[parseInt(val)], color: "#fff", fontWeight: 700 }}
                        />
                      ) : <em style={{ color: "#999" }}>Non impostato</em>
                    }
                  >
                    <MenuItem value=""><em>Non impostato</em></MenuItem>
                    {[1, 2, 3, 4, 5].map((r) => (
                      <MenuItem key={r} value={r.toString()}>
                        <Chip
                          label={ROLE_LABELS[r as keyof typeof ROLE_LABELS]}
                          size="small"
                          sx={{ bgcolor: ROLE_COLORS[r], color: "#fff", fontWeight: 700 }}
                        />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                Dati anagrafici
              </Typography>
              <Stack spacing={2}>
                <FormControl fullWidth size="small">
                  <InputLabel shrink>Genere</InputLabel>
                  <Select
                    label="Genere"
                    displayEmpty
                    notched
                    value={form.gender}
                    onChange={(e) => set("gender", e.target.value)}
                  >
                    <MenuItem value=""><em>Non impostato</em></MenuItem>
                    <MenuItem value="MALE">Maschio</MenuItem>
                    <MenuItem value="FEMALE">Femmina</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Data di nascita"
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => set("birthDate", e.target.value)}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Stack>
            </Box>

            {error && <Alert severity="error">{error}</Alert>}

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={saving || !form.email}
              startIcon={<PersonAddIcon />}
            >
              {saving ? "Creazione..." : "Crea utente"}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
