"use client";

import {
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Alert,
  CircularProgress,
} from "@mui/material";
import { useState, useEffect } from "react";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import { readError } from "@/lib/fetchJson";

export type OpposingTeamEditable = {
  id: string;
  name: string;
  slug: string | null;
  city: string | null;
  address: string | null;
  website: string | null;
  colors: string | null;
};

interface Props {
  open: boolean;
  onClose: () => void;
  team: OpposingTeamEditable | null;
  onSaved: (saved: OpposingTeamEditable) => void;
}

export default function OpposingTeamEditDialog({ open, onClose, team, onSaved }: Props) {
  const [form, setForm] = useState({
    name: "",
    city: "",
    address: "",
    website: "",
    colors: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !team) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({
      name: team.name,
      city: team.city ?? "",
      address: team.address ?? "",
      website: team.website ?? "",
      colors: team.colors ?? "",
    });
    setError("");
  }, [open, team]);

  async function handleSave() {
    if (!team) return;
    if (!form.name.trim()) {
      setError("Il nome non può essere vuoto");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/opposing-teams/${team.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          city: form.city.trim() || null,
          address: form.address.trim() || null,
          website: form.website.trim() || null,
          colors: form.colors.trim() || null,
        }),
      });
      if (!res.ok) {
        const message = await readError(res);
        setError(message);
        return;
      }
      const saved = (await res.json()) as OpposingTeamEditable;
      onSaved(saved);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <ResponsiveDialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle fontWeight={700}>Modifica squadra avversaria</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Nome"
            size="small"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            fullWidth
          />
          <TextField
            label="Città"
            size="small"
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            fullWidth
            placeholder="es. Vicenza"
          />
          <TextField
            label="Sede / Palasport"
            size="small"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            fullWidth
            placeholder="es. Palasport Cattane, via …"
            multiline
            minRows={1}
            maxRows={3}
          />
          <TextField
            label="Sito web"
            size="small"
            value={form.website}
            onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
            fullWidth
            placeholder="https://… o pagina FB"
          />
          <TextField
            label="Colori"
            size="small"
            value={form.colors}
            onChange={(e) => setForm((f) => ({ ...f, colors: e.target.value }))}
            fullWidth
            placeholder="es. Nero/Giallo"
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Annulla
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || !form.name.trim()}
          startIcon={saving ? <CircularProgress size={16} /> : undefined}
        >
          Salva
        </Button>
      </DialogActions>
    </ResponsiveDialog>
  );
}
