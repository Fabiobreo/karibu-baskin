"use client";

import {
  Box, Typography, Paper, Avatar, Chip, IconButton, Tooltip,
  Table, TableBody, TableCell, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button,
  Stack, TextField, Select, MenuItem, InputAdornment, TablePagination,
} from "@mui/material";
import WarningIcon from "@mui/icons-material/Warning";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import SearchIcon from "@mui/icons-material/Search";
import Link from "next/link";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ROLE_COLORS, sportRoleLabel, SPORT_ROLE_VARIANT_LABELS } from "@/lib/constants";
import { useToast } from "@/context/ToastContext";

type AnonReg = {
  id: string;
  name: string;
  anonymousEmail: string | null;
  role: number;
  createdAt: Date | string;
  session: { id: string; date: Date | string; dateSlug: string | null };
};

type AnonGroup = {
  name: string;
  regs: AnonReg[];
  hasEmail: boolean;
  emails: string[];
  ids: string[];
};

function groupByName(registrations: AnonReg[]): AnonGroup[] {
  const map = new Map<string, AnonGroup>();
  for (const reg of registrations) {
    const key = reg.name.toLowerCase().trim();
    if (!map.has(key)) {
      map.set(key, { name: reg.name, regs: [], hasEmail: false, emails: [], ids: [] });
    }
    const group = map.get(key)!;
    group.regs.push(reg);
    group.ids.push(reg.id);
    if (reg.anonymousEmail && !group.emails.includes(reg.anonymousEmail)) {
      group.emails.push(reg.anonymousEmail);
      group.hasEmail = true;
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    const latestA = Math.max(...a.regs.map(r => new Date(r.createdAt).getTime()));
    const latestB = Math.max(...b.regs.map(r => new Date(r.createdAt).getTime()));
    return latestB - latestA;
  });
}

interface EditState { name: string; anonymousEmail: string; role: string; roleVariant: string; }

export default function AdminAnonymousRegistrations({ registrations }: { registrations: AnonReg[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [groups, setGroups] = useState<AnonGroup[]>(() => groupByName(registrations));
  const [confirmGroup, setConfirmGroup] = useState<AnonGroup | null>(null);
  const [editGroup, setEditGroup] = useState<AnonGroup | null>(null);
  const [editState, setEditState] = useState<EditState>({ name: "", anonymousEmail: "", role: "", roleVariant: "" });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const { showToast } = useToast();

  if (groups.length === 0) return null;

  function openEdit(group: AnonGroup) {
    setEditGroup(group);
    const role = group.regs[0]?.role ?? null;
    const variant = (group.regs[0] as AnonReg & { roleVariant?: string })?.roleVariant ?? "";
    setEditState({
      name: group.name,
      anonymousEmail: group.emails[0] ?? "",
      role: role?.toString() ?? "",
      roleVariant: variant,
    });
  }

  async function handleSave() {
    if (!editGroup) return;
    setSaving(true);
    const body: Record<string, unknown> = {
      ids: editGroup.ids,
      name: editState.name || editGroup.name,
      anonymousEmail: editState.anonymousEmail || null,
    };
    if (editState.role) body.role = parseInt(editState.role);
    const res = await fetch("/api/registrations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      const newName = (body.name as string).trim();
      const newEmail = (body.anonymousEmail as string | null) ?? null;
      const newRole = editState.role ? parseInt(editState.role) : null;
      setGroups((prev) => prev.map((g) => {
        if (g !== editGroup) return g;
        const updatedRegs = g.regs.map((r) => ({
          ...r,
          name: newName,
          anonymousEmail: newEmail,
          role: newRole ?? r.role,
        }));
        const emails = newEmail ? [newEmail] : [];
        return { ...g, name: newName, regs: updatedRegs, emails, hasEmail: !!newEmail };
      }));
      showToast({ message: "Iscrizione aggiornata", severity: "success" });
      setEditGroup(null);
      router.refresh();
    } else {
      showToast({ message: "Errore nel salvataggio", severity: "error" });
    }
  }

  function handleDeleteConfirm() {
    if (!confirmGroup) return;
    const nameToDelete = confirmGroup.name;
    setConfirmGroup(null);
    startTransition(async () => {
      await fetch(`/api/registrations?name=${encodeURIComponent(nameToDelete)}`, { method: "DELETE" });
      setGroups((prev) => prev.filter((g) => g.name.toLowerCase().trim() !== nameToDelete.toLowerCase().trim()));
      router.refresh();
    });
  }

  const filtered = search.trim()
    ? groups.filter((g) =>
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        g.emails.some((e) => e.toLowerCase().includes(search.toLowerCase()))
      )
    : groups;

  const paginated = filtered.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  const anyWithoutEmail = groups.some((g) => !g.hasEmail);

  return (
    <>
      <Paper elevation={2} sx={{ p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <WarningIcon fontSize="small" color="action" />
          <Typography variant="subtitle1" fontWeight={700}>
            Iscrizioni anonime
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1.5 }}>
            {filtered.length !== groups.length
              ? `${filtered.length} di ${groups.length}`
              : `${groups.length} ${groups.length === 1 ? "persona" : "persone"}`}
          </Typography>
        </Box>
        <Box sx={{ mb: 2 }}>
          <TextField
            placeholder="Cerca per nome..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            size="small"
            sx={{ width: { xs: "100%", sm: 280 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </Box>
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ pl: 0, width: 40 }} />
                <TableCell sx={{ fontWeight: 700 }}>Nome</TableCell>
                <TableCell sx={{ fontWeight: 700, display: { xs: "none", sm: "table-cell" } }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Allenamenti</TableCell>
                <TableCell sx={{ width: 40 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.map((group) => (
                <TableRow
                  key={group.name.toLowerCase().trim()}
                  hover
                  sx={!group.hasEmail ? { bgcolor: "warning.50" } : undefined}
                >
                  <TableCell sx={{ width: 40, pl: 0 }}>
                    <Avatar sx={{ width: 30, height: 30, fontSize: 13, bgcolor: !group.hasEmail ? "warning.light" : "grey.400" }}>
                      {!group.hasEmail
                        ? <WarningIcon sx={{ fontSize: 16, color: "warning.dark" }} />
                        : group.name[0].toUpperCase()
                      }
                    </Avatar>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{group.name}</Typography>
                    {!group.hasEmail && (
                      <Typography variant="caption" color="warning.dark" fontWeight={600}>Nessuna email</Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                    <Typography variant="body2" color={!group.hasEmail ? "text.disabled" : "text.primary"}>
                      {group.emails.length > 0 ? group.emails.join(", ") : "—"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {group.regs.map((reg) => (
                        <Link key={reg.id} href={`/allenamento/${reg.session.dateSlug ?? reg.session.id}`} style={{ textDecoration: "none" }}>
                          <Chip
                            label={format(new Date(reg.session.date), "d MMM yy", { locale: it })}
                            size="small"
                            clickable
                            sx={{ fontSize: "0.65rem", fontWeight: 600 }}
                          />
                        </Link>
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ pr: 0 }}>
                    <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5 }}>
                      <Tooltip title="Modifica">
                        <IconButton size="small" aria-label="Modifica iscrizione anonima" disabled={isPending} onClick={() => openEdit(group)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Elimina tutte le iscrizioni di questo nome">
                        <IconButton size="small" aria-label="Elimina tutte le iscrizioni di questo nome" color="error" disabled={isPending} onClick={() => setConfirmGroup(group)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Paper>

      <TablePagination
        component="div"
        count={filtered.length}
        page={page}
        onPageChange={(_e, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
        rowsPerPageOptions={[5, 10, 25, 50]}
        labelRowsPerPage="Righe:"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} di ${count}`}
        sx={{ borderTop: "1px solid", borderColor: "divider" }}
      />

      <Dialog open={!!editGroup} onClose={() => setEditGroup(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Modifica — {editGroup?.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" gutterBottom>Nome</Typography>
              <TextField
                fullWidth size="small"
                value={editState.name}
                onChange={(e) => setEditState((s) => ({ ...s, name: e.target.value }))}
                inputProps={{ maxLength: 60 }}
              />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" gutterBottom>Email</Typography>
              <TextField
                fullWidth size="small" type="email"
                value={editState.anonymousEmail}
                onChange={(e) => setEditState((s) => ({ ...s, anonymousEmail: e.target.value }))}
                inputProps={{ maxLength: 254 }}
                placeholder="Lascia vuoto per nessuna email"
              />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" gutterBottom>Ruolo Baskin (1–5)</Typography>
              <Select
                fullWidth size="small" displayEmpty
                value={editState.role}
                onChange={(e) => setEditState((s) => ({ ...s, role: e.target.value, roleVariant: "" }))}
              >
                <MenuItem value=""><em>Non impostato</em></MenuItem>
                {[1, 2, 3, 4, 5].map((r) => (
                  <MenuItem key={r} value={r.toString()}>
                    <Chip label={sportRoleLabel(r)} size="small" sx={{ bgcolor: ROLE_COLORS[r], color: "#fff", fontWeight: 700, fontSize: "0.72rem" }} />
                  </MenuItem>
                ))}
              </Select>
            </Box>
            {["1", "2"].includes(editState.role) && (
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" gutterBottom>Variante ruolo</Typography>
                <Select
                  fullWidth size="small" displayEmpty
                  value={editState.roleVariant}
                  onChange={(e) => setEditState((s) => ({ ...s, roleVariant: e.target.value }))}
                >
                  <MenuItem value=""><em>Nessuna variante (standard)</em></MenuItem>
                  {editState.role === "1" && <MenuItem value="S">S — {SPORT_ROLE_VARIANT_LABELS["S"]}</MenuItem>}
                  {editState.role === "2" && [
                    <MenuItem key="T" value="T">T — {SPORT_ROLE_VARIANT_LABELS["T"]}</MenuItem>,
                    <MenuItem key="P" value="P">P — {SPORT_ROLE_VARIANT_LABELS["P"]}</MenuItem>,
                    <MenuItem key="R" value="R">R — {SPORT_ROLE_VARIANT_LABELS["R"]}</MenuItem>,
                  ]}
                </Select>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditGroup(null)}>Annulla</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? "Salvataggio..." : "Salva"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!confirmGroup} onClose={() => setConfirmGroup(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Elimina iscrizioni anonime</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Stai per eliminare tutte le {confirmGroup?.regs.length} iscrizioni di{" "}
            <strong>{confirmGroup?.name}</strong> da tutti gli allenamenti. L&apos;operazione non è reversibile.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmGroup(null)}>Annulla</Button>
          <Button color="error" variant="contained" onClick={handleDeleteConfirm} disabled={isPending}>
            Elimina
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
