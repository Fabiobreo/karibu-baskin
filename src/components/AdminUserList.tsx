"use client";
import { useState } from "react";
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Avatar, Typography, Select, MenuItem, Chip,
  TextField, InputAdornment, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, Divider, Stack,
  DialogContentText, Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import HistoryIcon from "@mui/icons-material/History";
import type { AppRole, Gender } from "@prisma/client";
import { ROLE_LABELS_IT } from "@/lib/authRoles";
import { ROLE_COLORS, SPORT_ROLE_VARIANT_LABELS, sportRoleLabel } from "@/lib/constants";
import { useToast } from "@/context/ToastContext";
import { format } from "date-fns";
import { it } from "date-fns/locale";

const APP_ROLE_COLORS: Record<AppRole, "default" | "warning" | "info" | "success" | "error"> = {
  GUEST: "default",
  ATHLETE: "info",
  PARENT: "success",
  COACH: "warning",
  ADMIN: "error",
};

const GENDER_LABELS: Record<Gender, string> = {
  MALE: "Maschio",
  FEMALE: "Femmina",
};

interface RoleHistoryEntry {
  sportRole: number;
  changedAt: Date | string;
}

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  appRole: AppRole;
  sportRole: number | null;
  sportRoleVariant: string | null;
  sportRoleSuggested: number | null;
  sportRoleSuggestedVariant: string | null;
  gender: Gender | null;
  birthDate: Date | string | null;
  createdAt: Date | string;
  _count: { registrations: number };
  sportRoleHistory: RoleHistoryEntry[];
}

interface EditState {
  sportRole: string;        // stringa per il select ("" = non impostato)
  sportRoleVariant: string; // "" | "S" | "T" | "P" | "R"
  gender: string;           // "" | "MALE" | "FEMALE"
  birthDate: string;        // "YYYY-MM-DD" o ""
}

export default function AdminUserList({ users: initialUsers }: { users: User[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editState, setEditState] = useState<EditState>({ sportRole: "", sportRoleVariant: "", gender: "", birthDate: "" });
  const [saving, setSaving] = useState(false);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();

  const filtered = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  async function handleRoleChange(userId: string, newRole: AppRole) {
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appRole: newRole }),
    });
    if (res.ok) {
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, appRole: newRole } : u));
      showToast({ message: `Ruolo aggiornato a ${ROLE_LABELS_IT[newRole]}`, severity: "success" });
    } else {
      showToast({ message: "Errore aggiornamento ruolo", severity: "error" });
    }
  }

  function openEdit(user: User) {
    setEditUser(user);
    setEditState({
      sportRole: user.sportRole?.toString() ?? "",
      sportRoleVariant: user.sportRoleVariant ?? "",
      gender: user.gender ?? "",
      birthDate: user.birthDate
        ? new Date(user.birthDate).toISOString().slice(0, 10)
        : "",
    });
  }

  async function handleSaveAthleteData() {
    if (!editUser) return;
    setSaving(true);
    const payload: Record<string, unknown> = {
      sportRole: editState.sportRole ? parseInt(editState.sportRole) : null,
      sportRoleVariant: editState.sportRoleVariant || null,
      gender: editState.gender || null,
      birthDate: editState.birthDate || null,
    };
    const res = await fetch(`/api/users/${editUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      const updated = await res.json();
      setUsers((prev) => prev.map((u) => u.id === editUser.id ? {
        ...u,
        sportRole: updated.sportRole,
        gender: updated.gender,
        birthDate: updated.birthDate,
        // Aggiorna storico solo se il ruolo è cambiato
        sportRoleHistory:
          updated.sportRole !== editUser.sportRole && updated.sportRole !== null
            ? [{ sportRole: updated.sportRole, changedAt: new Date().toISOString() }, ...editUser.sportRoleHistory]
            : editUser.sportRoleHistory,
      } : u));
      showToast({ message: "Dati atleta aggiornati", severity: "success" });
      setEditUser(null);
    } else {
      showToast({ message: "Errore nel salvataggio", severity: "error" });
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteUser) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/users/${deleteUser.id}`, { method: "DELETE" });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== deleteUser.id));
        showToast({ message: `Utente "${deleteUser.name ?? deleteUser.email}" eliminato`, severity: "success" });
        setDeleteUser(null);
      } else {
        const data = await res.json().catch(() => ({}));
        showToast({ message: data.error ?? "Errore durante l'eliminazione", severity: "error" });
      }
    } catch {
      showToast({ message: "Errore di rete, riprova", severity: "error" });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Box>
      <TextField
        placeholder="Cerca per nome o email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        size="small"
        sx={{ mb: 2, width: { xs: "100%", sm: 320 } }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />

      <TableContainer component={Box} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Utente</TableCell>
              <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Email</TableCell>
              <TableCell>Ruolo utente</TableCell>
              <TableCell align="center">Ruolo Baskin</TableCell>
              <TableCell align="center">Genere</TableCell>
              <TableCell align="center">Iscrizioni</TableCell>
              <TableCell align="center">Modifica</TableCell>
              <TableCell align="center">Elimina</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Avatar src={user.image ?? undefined} sx={{ width: 32, height: 32, fontSize: 14 }}>
                      {user.name?.[0] ?? user.email[0].toUpperCase()}
                    </Avatar>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {user.name ?? "—"}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                  <Typography variant="body2" color="text.secondary">{user.email}</Typography>
                </TableCell>
                <TableCell>
                  <Select
                    value={user.appRole}
                    size="small"
                    onChange={(e) => handleRoleChange(user.id, e.target.value as AppRole)}
                    sx={{ minWidth: 120, fontSize: "0.8rem" }}
                    renderValue={(val) => (
                      <Chip label={ROLE_LABELS_IT[val as AppRole]} size="small" color={APP_ROLE_COLORS[val as AppRole]} sx={{ fontWeight: 600 }} />
                    )}
                  >
                    {(["GUEST", "ATHLETE", "PARENT", "COACH", "ADMIN"] as AppRole[]).map((r) => (
                      <MenuItem key={r} value={r}>
                        <Chip label={ROLE_LABELS_IT[r]} size="small" color={APP_ROLE_COLORS[r]} sx={{ fontWeight: 600 }} />
                      </MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell align="center">
                  {user.sportRole
                    ? <Chip
                        label={sportRoleLabel(user.sportRole, user.sportRoleVariant)}
                        size="small"
                        sx={{
                          bgcolor: ROLE_COLORS[user.sportRole],
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: "0.72rem",
                        }}
                      />
                    : user.sportRoleSuggested
                      ? <Chip
                          label={`${sportRoleLabel(user.sportRoleSuggested, user.sportRoleSuggestedVariant)} ?`}
                          size="small"
                          variant="outlined"
                          sx={{
                            borderColor: ROLE_COLORS[user.sportRoleSuggested],
                            color: ROLE_COLORS[user.sportRoleSuggested],
                            fontWeight: 700,
                            fontSize: "0.72rem",
                          }}
                          title="Autovalutazione utente — da confermare"
                        />
                      : <Typography variant="body2" color="text.disabled">—</Typography>}
                </TableCell>
                <TableCell align="center">
                  {user.gender
                    ? <Typography variant="body2">{GENDER_LABELS[user.gender]}</Typography>
                    : <Typography variant="body2" color="text.disabled">—</Typography>}
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2">{user._count.registrations}</Typography>
                </TableCell>
                <TableCell align="center">
                  <IconButton size="small" onClick={() => openEdit(user)} title="Modifica dati atleta">
                    <EditIcon fontSize="small" />
                  </IconButton>
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="Elimina utente">
                    <IconButton size="small" color="error" onClick={() => setDeleteUser(user)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  Nessun utente trovato
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog conferma eliminazione */}
      <Dialog open={!!deleteUser} onClose={() => !deleting && setDeleteUser(null)}>
        <DialogTitle>Elimina utente</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Sei sicuro di voler eliminare <strong>{deleteUser?.name ?? deleteUser?.email}</strong>?
            Verranno eliminate anche tutte le iscrizioni associate. Questa azione è irreversibile.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteUser(null)} disabled={deleting}>
            Annulla
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={deleting}>
            {deleting ? "Eliminazione..." : "Elimina"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog modifica atleta */}
      <Dialog open={!!editUser} onClose={() => setEditUser(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Dati atleta — {editUser?.name ?? editUser?.email}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {/* Ruolo Baskin */}
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" gutterBottom>
                Ruolo Baskin (1–5)
              </Typography>
              {editUser?.sportRoleSuggested && !editUser.sportRole && (
                <Typography variant="caption" color="warning.main" display="block" sx={{ mb: 0.5 }}>
                  Autovalutazione: {sportRoleLabel(editUser.sportRoleSuggested, editUser.sportRoleSuggestedVariant)}
                  {editUser.sportRoleSuggestedVariant
                    ? ` — ${SPORT_ROLE_VARIANT_LABELS[editUser.sportRoleSuggestedVariant] ?? ""}`
                    : ""}
                </Typography>
              )}
              <Select
                fullWidth
                size="small"
                displayEmpty
                value={editState.sportRole}
                onChange={(e) => setEditState((s) => ({ ...s, sportRole: e.target.value, sportRoleVariant: "" }))}
              >
                <MenuItem value=""><em>Non impostato</em></MenuItem>
                {[1, 2, 3, 4, 5].map((r) => (
                  <MenuItem key={r} value={r.toString()}>
                    <Chip
                      label={sportRoleLabel(r)}
                      size="small"
                      sx={{ bgcolor: ROLE_COLORS[r], color: "#fff", fontWeight: 700, fontSize: "0.72rem" }}
                    />
                  </MenuItem>
                ))}
              </Select>
            </Box>

            {/* Variante ruolo (solo se ruolo 1 o 2) */}
            {["1", "2"].includes(editState.sportRole) && (
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" gutterBottom>
                  Variante ruolo
                </Typography>
                <Select
                  fullWidth
                  size="small"
                  displayEmpty
                  value={editState.sportRoleVariant}
                  onChange={(e) => setEditState((s) => ({ ...s, sportRoleVariant: e.target.value }))}
                >
                  <MenuItem value=""><em>Nessuna variante (standard)</em></MenuItem>
                  {editState.sportRole === "1" && (
                    <MenuItem value="S">S — {SPORT_ROLE_VARIANT_LABELS["S"]}</MenuItem>
                  )}
                  {editState.sportRole === "2" && [
                    <MenuItem key="T" value="T">T — {SPORT_ROLE_VARIANT_LABELS["T"]}</MenuItem>,
                    <MenuItem key="P" value="P">P — {SPORT_ROLE_VARIANT_LABELS["P"]}</MenuItem>,
                    <MenuItem key="R" value="R">R — {SPORT_ROLE_VARIANT_LABELS["R"]}</MenuItem>,
                  ]}
                </Select>
              </Box>
            )}

            {/* Genere */}
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" gutterBottom>
                Genere
              </Typography>
              <Select
                fullWidth
                size="small"
                displayEmpty
                value={editState.gender}
                onChange={(e) => setEditState((s) => ({ ...s, gender: e.target.value }))}
              >
                <MenuItem value=""><em>Non impostato</em></MenuItem>
                <MenuItem value="MALE">Maschio</MenuItem>
                <MenuItem value="FEMALE">Femmina</MenuItem>
              </Select>
            </Box>

            {/* Data di nascita */}
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" gutterBottom>
                Data di nascita (opzionale)
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="date"
                value={editState.birthDate}
                onChange={(e) => setEditState((s) => ({ ...s, birthDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Box>

            {/* Storico ruolo */}
            {editUser && editUser.sportRoleHistory.length > 0 && (
              <Box>
                <Divider sx={{ mb: 1.5 }} />
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
                  <HistoryIcon fontSize="small" color="action" />
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Storico ruolo Baskin
                  </Typography>
                </Box>
                <Stack spacing={0.5}>
                  {editUser.sportRoleHistory.map((h, i) => (
                    <Typography key={i} variant="caption" color="text.secondary">
                      {sportRoleLabel(h.sportRole)}
                      {" · "}
                      {format(new Date(h.changedAt), "d MMM yyyy", { locale: it })}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditUser(null)}>Annulla</Button>
          <Button variant="contained" onClick={handleSaveAthleteData} disabled={saving}>
            {saving ? "Salvataggio..." : "Salva"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
