"use client";
import { useState } from "react";
import {
  Box, TextField, Button, Typography, List, ListItem,
  ListItemText, IconButton, Paper, CircularProgress, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Select, MenuItem, Stack, Divider,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import LinkIcon from "@mui/icons-material/Link";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import { useToast } from "@/context/ToastContext";
import { ROLE_COLORS, sportRoleLabel, GENDER_LABELS } from "@/lib/constants";
import type { Gender } from "@prisma/client";

// ── Tipi ─────────────────────────────────────────────────────────────────────

export interface ChildData {
  id: string;
  name: string;
  sportRole: number | null;
  sportRoleVariant: string | null;
  gender: Gender | null;
  birthDate: string | Date | null;
  userId: string | null;
}

interface FormState {
  name: string;
  sportRole: string;
  sportRoleVariant: string;
  gender: string;
  birthDate: string;
}

const EMPTY_FORM: FormState = { name: "", sportRole: "", sportRoleVariant: "", gender: "", birthDate: "" };

// ── Componente ────────────────────────────────────────────────────────────────

export default function ParentChildLinker({ initialChildren }: { initialChildren: ChildData[] }) {
  const [children, setChildren] = useState<ChildData[]>(initialChildren);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ChildData | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [linkTarget, setLinkTarget] = useState<ChildData | null>(null);
  const [linkEmail, setLinkEmail] = useState("");
  const [linking, setLinking] = useState(false);
  const { showToast } = useToast();

  function openAdd() { setEditTarget(null); setForm(EMPTY_FORM); setDialogOpen(true); }

  function openEdit(child: ChildData) {
    setEditTarget(child);
    setForm({
      name: child.name,
      sportRole: child.sportRole?.toString() ?? "",
      sportRoleVariant: child.sportRoleVariant ?? "",
      gender: child.gender ?? "",
      birthDate: child.birthDate ? new Date(child.birthDate).toISOString().slice(0, 10) : "",
    });
    setDialogOpen(true);
  }

  function closeDialog() { setDialogOpen(false); setEditTarget(null); setForm(EMPTY_FORM); }

  async function handleSave() {
    if (!form.name.trim()) { showToast({ message: "Il nome è obbligatorio", severity: "warning" }); return; }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      sportRole: form.sportRole ? parseInt(form.sportRole) : null,
      sportRoleVariant: form.sportRoleVariant || null,
      gender: form.gender || null,
      birthDate: form.birthDate || null,
    };
    try {
      if (editTarget) {
        const res = await fetch(`/api/children/${editTarget.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) { showToast({ message: data.error ?? "Errore nel salvataggio", severity: "error" }); return; }
        setChildren((prev) => prev.map((c) => c.id === editTarget.id ? data : c));
        showToast({ message: `${data.name} aggiornato`, severity: "success" });
      } else {
        const res = await fetch("/api/users/me/children", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) { showToast({ message: data.error ?? "Errore nell'aggiunta", severity: "error" }); return; }
        setChildren((prev) => [...prev, data]);
        showToast({ message: `${data.name} aggiunto!`, severity: "success" });
      }
      closeDialog();
    } catch {
      showToast({ message: "Errore di rete", severity: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleLink() {
    if (!linkTarget || !linkEmail.trim()) return;
    setLinking(true);
    try {
      const res = await fetch(`/api/children/${linkTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkEmail: linkEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { showToast({ message: data.error ?? "Errore nel collegamento", severity: "error" }); return; }
      setChildren((prev) => prev.map((c) => c.id === linkTarget.id ? { ...c, userId: data.userId } : c));
      showToast({ message: `Account collegato a ${linkTarget.name}`, severity: "success" });
      setLinkTarget(null);
      setLinkEmail("");
    } catch {
      showToast({ message: "Errore di rete", severity: "error" });
    } finally {
      setLinking(false);
    }
  }

  async function handleUnlink(child: ChildData) {
    try {
      const res = await fetch(`/api/children/${child.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unlinkAccount: true }),
      });
      if (!res.ok) { showToast({ message: "Errore nello scollegamento", severity: "error" }); return; }
      setChildren((prev) => prev.map((c) => c.id === child.id ? { ...c, userId: null } : c));
      showToast({ message: `Account scollegato da ${child.name}`, severity: "info" });
    } catch {
      showToast({ message: "Errore di rete", severity: "error" });
    }
  }

  async function handleDelete(child: ChildData) {
    setDeletingId(child.id);
    try {
      await fetch(`/api/children/${child.id}`, { method: "DELETE" });
      setChildren((prev) => prev.filter((c) => c.id !== child.id));
      showToast({ message: `${child.name} rimosso`, severity: "info" });
    } catch {
      showToast({ message: "Errore durante la rimozione", severity: "error" });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Box>
      {children.length > 0 ? (
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <List disablePadding>
            {children.map((child, idx) => (
              <ListItem
                key={child.id}
                divider={idx < children.length - 1}
                secondaryAction={
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    {child.userId ? (
                      <IconButton size="small" color="default" onClick={() => handleUnlink(child)}
                        title="Scollega account">
                        <LinkOffIcon fontSize="small" />
                      </IconButton>
                    ) : (
                      <IconButton size="small" color="primary" onClick={() => { setLinkTarget(child); setLinkEmail(""); }}
                        title="Collega account">
                        <LinkIcon fontSize="small" />
                      </IconButton>
                    )}
                    <IconButton size="small" onClick={() => openEdit(child)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(child)} disabled={deletingId === child.id}>
                      {deletingId === child.id ? <CircularProgress size={16} /> : <DeleteIcon fontSize="small" />}
                    </IconButton>
                  </Box>
                }
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                      <Typography variant="body2" fontWeight={600}>{child.name}</Typography>
                      {child.sportRole && (
                        <Chip label={sportRoleLabel(child.sportRole, child.sportRoleVariant)} size="small"
                          sx={{ bgcolor: ROLE_COLORS[child.sportRole], color: "#fff", fontWeight: 700, fontSize: "0.7rem" }} />
                      )}
                      {child.gender && (
                        <Typography variant="caption" color="text.secondary">{GENDER_LABELS[child.gender]}</Typography>
                      )}
                      {child.userId
                        ? <Chip label="Account collegato" size="small" color="success" variant="outlined"
                            sx={{ fontSize: "0.65rem", height: 18 }} />
                        : <Chip label="Senza account" size="small" variant="outlined"
                            sx={{ fontSize: "0.65rem", height: 18, color: "text.disabled", borderColor: "divider" }} />
                      }
                    </Box>
                  }
                  primaryTypographyProps={{ component: "div" }}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Nessun figlio aggiunto.</Typography>
      )}

      <Button variant="outlined" startIcon={<PersonAddIcon />} onClick={openAdd} size="small">
        Aggiungi figlio/a
      </Button>

      {/* Dialog collega account */}
      <Dialog open={!!linkTarget} onClose={() => { setLinkTarget(null); setLinkEmail(""); }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Collega account — {linkTarget?.name}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Inserisci l&apos;email dell&apos;account Google con cui {linkTarget?.name} si logga nell&apos;app.
          </Typography>
          <TextField
            label="Email account"
            type="email"
            value={linkEmail}
            onChange={(e) => setLinkEmail(e.target.value)}
            fullWidth size="small"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleLink()}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
            Una volta collegati, il genitore può iscrivere il figlio agli allenamenti e viceversa il figlio può iscriversi da solo.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setLinkTarget(null); setLinkEmail(""); }} disabled={linking}>Annulla</Button>
          <Button variant="contained" onClick={handleLink} disabled={linking || !linkEmail.trim()}
            startIcon={linking ? <CircularProgress size={14} color="inherit" /> : <LinkIcon />}>
            {linking ? "Collegamento..." : "Collega"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog aggiungi/modifica */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editTarget ? `Modifica — ${editTarget.name}` : "Aggiungi figlio/a"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField label="Nome e cognome *" value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              fullWidth size="small" inputProps={{ maxLength: 60 }} />
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" gutterBottom>Ruolo Baskin</Typography>
              <Select fullWidth size="small" displayEmpty value={form.sportRole}
                onChange={(e) => setForm((s) => ({ ...s, sportRole: e.target.value, sportRoleVariant: "" }))}>
                <MenuItem value=""><em>Non ancora assegnato</em></MenuItem>
                {[1, 2, 3, 4, 5].map((r) => (
                  <MenuItem key={r} value={r.toString()}>
                    <Chip label={sportRoleLabel(r)} size="small"
                      sx={{ bgcolor: ROLE_COLORS[r], color: "#fff", fontWeight: 700, fontSize: "0.72rem" }} />
                  </MenuItem>
                ))}
              </Select>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" gutterBottom>Genere</Typography>
              <Select fullWidth size="small" displayEmpty value={form.gender}
                onChange={(e) => setForm((s) => ({ ...s, gender: e.target.value }))}>
                <MenuItem value=""><em>Non specificato</em></MenuItem>
                <MenuItem value="MALE">Maschio</MenuItem>
                <MenuItem value="FEMALE">Femmina</MenuItem>
              </Select>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" gutterBottom>Data di nascita</Typography>
              <TextField fullWidth size="small" type="date" value={form.birthDate}
                onChange={(e) => setForm((s) => ({ ...s, birthDate: e.target.value }))}
                InputLabelProps={{ shrink: true }} />
            </Box>
            <Divider />
            <Typography variant="caption" color="text.secondary">
              Il ruolo Baskin può essere assegnato anche in seguito dall&apos;allenatore.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeDialog} disabled={saving}>Annulla</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !form.name.trim()}>
            {saving ? "Salvataggio..." : editTarget ? "Salva modifiche" : "Aggiungi"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
