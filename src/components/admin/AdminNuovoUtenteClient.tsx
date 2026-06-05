"use client";
import { useState } from "react";
import {
  Box,
  Paper,
  TextField,
  Select,
  MenuItem,
  Button,
  Stack,
  Divider,
  FormControl,
  InputLabel,
  Chip,
} from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import { useRouter } from "next/navigation";
import type { AppRole } from "@prisma/client";
import { ROLE_LABELS_IT, ROLE_CHIP_COLORS } from "@/lib/authRoles";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/constants";
import { useToast } from "@/context/ToastContext";

export default function AdminNuovoUtenteClient() {
  const router = useRouter();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
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
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

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
      showToast({ message: data.error ?? "Errore durante la creazione", severity: "error" });
    }
  }

  return (
    <Paper elevation={2} sx={{ p: { xs: 2, md: 3 }, maxWidth: 520 }}>
      <form onSubmit={handleSubmit}>
        <Stack spacing={3}>
          <Box>
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
            <Stack spacing={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Ruolo utente</InputLabel>
                <Select
                  label="Ruolo utente"
                  value={form.appRole}
                  onChange={(e) => set("appRole", e.target.value)}
                  renderValue={(val) => (
                    <Chip
                      label={ROLE_LABELS_IT[val as AppRole]}
                      size="small"
                      color={ROLE_CHIP_COLORS[val as AppRole]}
                      sx={{ fontWeight: 600 }}
                    />
                  )}
                >
                  {(["GUEST", "ATHLETE", "PARENT", "COACH", "ADMIN"] as AppRole[]).map((r) => (
                    <MenuItem key={r} value={r}>
                      <Chip
                        label={ROLE_LABELS_IT[r]}
                        size="small"
                        color={ROLE_CHIP_COLORS[r]}
                        sx={{ fontWeight: 600 }}
                      />
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
                        sx={{
                          bgcolor: ROLE_COLORS[parseInt(val)],
                          color: "common.white",
                          fontWeight: 700,
                        }}
                      />
                    ) : (
                      <em style={{ color: "inherit", opacity: 0.6 }}>Non impostato</em>
                    )
                  }
                >
                  <MenuItem value="">
                    <em>Non impostato</em>
                  </MenuItem>
                  {[1, 2, 3, 4, 5].map((r) => (
                    <MenuItem key={r} value={r.toString()}>
                      <Chip
                        label={ROLE_LABELS[r as keyof typeof ROLE_LABELS]}
                        size="small"
                        sx={{ bgcolor: ROLE_COLORS[r], color: "common.white", fontWeight: 700 }}
                      />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Box>

          <Divider />

          <Box>
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
                  <MenuItem value="">
                    <em>Non impostato</em>
                  </MenuItem>
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
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>
          </Box>

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
  );
}
