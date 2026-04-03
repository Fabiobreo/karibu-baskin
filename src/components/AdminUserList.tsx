"use client";
import { useState, useMemo } from "react";
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Avatar, Typography, Select, MenuItem, Chip,
  TextField, InputAdornment, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, Divider, Stack,
  DialogContentText, Tooltip, ToggleButton, ToggleButtonGroup,
  TableSortLabel, TablePagination, Badge,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import HistoryIcon from "@mui/icons-material/History";
import FilterListIcon from "@mui/icons-material/FilterList";
import type { AppRole, Gender } from "@prisma/client";
import { ROLE_LABELS_IT, ROLE_CHIP_COLORS, ROLE_HIERARCHY } from "@/lib/authRoles";
import { ROLE_COLORS, SPORT_ROLE_VARIANT_LABELS, sportRoleLabel, GENDER_LABELS_SHORT } from "@/lib/constants";
import { useToast } from "@/context/ToastContext";
import { format } from "date-fns";
import { it } from "date-fns/locale";

// ── Tipi ────────────────────────────────────────────────────────────────────

const ALL_APP_ROLES: AppRole[] = ["GUEST", "ATHLETE", "PARENT", "COACH", "ADMIN"];

type SortColumn = "name" | "createdAt" | "sportRole" | "registrations" | "appRole";

interface RoleHistoryEntry { sportRole: number; changedAt: Date | string; }

interface UserEntry {
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

interface ChildEntry {
  id: string;
  name: string;
  sportRole: number | null;
  sportRoleVariant: string | null;
  gender: Gender | null;
  birthDate: Date | string | null;
  createdAt: Date | string;
  parent: { name: string | null; email: string };
  _count: { registrations: number };
}

type AdminRow =
  | (UserEntry & { kind: "user" })
  | (ChildEntry & { kind: "child" });

interface EditState {
  sportRole: string;
  sportRoleVariant: string;
  gender: string;
  birthDate: string;
}

// ── Componente ───────────────────────────────────────────────────────────────

export default function AdminUserList({
  users: initialUsers,
  childEntries: initialChildren,
}: {
  users: UserEntry[];
  childEntries: ChildEntry[];
}) {
  const [rows, setRows] = useState<AdminRow[]>(() => [
    ...initialUsers.map((u) => ({ ...u, kind: "user" as const })),
    ...initialChildren.map((c) => ({ ...c, kind: "child" as const })),
  ]);

  // Filtri
  const [search, setSearch] = useState("");
  const [filterAppRoles, setFilterAppRoles] = useState<AppRole[]>([]);
  const [filterSportRoles, setFilterSportRoles] = useState<string[]>([]); // "none" | "1"–"5"
  const [filterGender, setFilterGender] = useState("");       // "" | "MALE" | "FEMALE" | "none"

  // Ordinamento
  const [sortBy, setSortBy] = useState<SortColumn>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Paginazione
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Dialogs
  const [editRow, setEditRow] = useState<AdminRow | null>(null);
  const [editState, setEditState] = useState<EditState>({ sportRole: "", sportRoleVariant: "", gender: "", birthDate: "" });
  const [saving, setSaving] = useState(false);
  const [deleteRow, setDeleteRow] = useState<AdminRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { showToast } = useToast();

  const userCount = rows.filter((r) => r.kind === "user").length;
  const childCount = rows.filter((r) => r.kind === "child").length;

  // ── Filtro + ordinamento (memo) ────────────────────────────────────────────

  const activeFilterCount =
    filterAppRoles.length +
    (filterSportRoles.length > 0 ? 1 : 0) +
    (filterGender ? 1 : 0) +
    (search ? 1 : 0);

  const processed = useMemo(() => {
    let result = rows;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((r) => {
        if (r.kind === "user") {
          return r.name?.toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
        }
        return (
          r.name.toLowerCase().includes(q) ||
          r.parent.name?.toLowerCase().includes(q) ||
          r.parent.email.toLowerCase().includes(q)
        );
      });
    }
    if (filterAppRoles.length > 0) {
      // I figli senza account non hanno appRole — vengono esclusi quando si filtra per ruolo
      result = result.filter((r) => r.kind === "user" && filterAppRoles.includes(r.appRole));
    }
    if (filterSportRoles.length > 0) {
      result = result.filter((r) => {
        if (filterSportRoles.includes("none") && !r.sportRole) return true;
        if (r.sportRole && filterSportRoles.includes(r.sportRole.toString())) return true;
        return false;
      });
    }
    if (filterGender === "none") {
      result = result.filter((r) => !r.gender);
    } else if (filterGender) {
      result = result.filter((r) => r.gender === filterGender);
    }

    return [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "name":
          cmp = (a.name ?? "").localeCompare(b.name ?? "", "it");
          break;
        case "createdAt":
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "sportRole":
          cmp = (a.sportRole ?? 99) - (b.sportRole ?? 99);
          break;
        case "registrations":
          cmp = a._count.registrations - b._count.registrations;
          break;
        case "appRole": {
          const aRole = a.kind === "user" ? ROLE_HIERARCHY[a.appRole] : -1;
          const bRole = b.kind === "user" ? ROLE_HIERARCHY[b.appRole] : -1;
          cmp = aRole - bRole;
          break;
        }
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, search, filterAppRoles, filterSportRoles, filterGender, sortBy, sortDir]);

  const paginated = processed.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  function handleSort(col: SortColumn) {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
    setPage(0);
  }

  function resetFilters() {
    setSearch("");
    setFilterAppRoles([]);
    setFilterSportRoles([]);
    setFilterGender("");
    setPage(0);
  }

  function toggleAppRole(role: AppRole) {
    setFilterAppRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
    setPage(0);
  }

  function toggleSportRole(val: string) {
    setFilterSportRoles((prev) =>
      prev.includes(val) ? prev.filter((r) => r !== val) : [...prev, val]
    );
    setPage(0);
  }

  // ── Azioni tabella ────────────────────────────────────────────────────────

  async function handleRoleChange(userId: string, newRole: AppRole) {
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appRole: newRole }),
    });
    if (res.ok) {
      setRows((prev) =>
        prev.map((r) => r.kind === "user" && r.id === userId ? { ...r, appRole: newRole } : r)
      );
      showToast({ message: `Ruolo aggiornato a ${ROLE_LABELS_IT[newRole]}`, severity: "success" });
    } else {
      showToast({ message: "Errore aggiornamento ruolo", severity: "error" });
    }
  }

  function openEdit(row: AdminRow) {
    setEditRow(row);
    setEditState({
      sportRole: row.sportRole?.toString() ?? "",
      sportRoleVariant: row.sportRoleVariant ?? "",
      gender: row.gender ?? "",
      birthDate: row.birthDate ? new Date(row.birthDate).toISOString().slice(0, 10) : "",
    });
  }

  async function handleSaveAthleteData() {
    if (!editRow) return;
    setSaving(true);
    const payload: Record<string, unknown> = {
      sportRole: editState.sportRole ? parseInt(editState.sportRole) : null,
      sportRoleVariant: editState.sportRoleVariant || null,
      gender: editState.gender || null,
      birthDate: editState.birthDate || null,
    };
    const url = editRow.kind === "user"
      ? `/api/users/${editRow.id}`
      : `/api/children/${editRow.id}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      const updated = await res.json();
      if (editRow.kind === "user") {
        setRows((prev) => prev.map((r) => r.id === editRow.id && r.kind === "user" ? {
          ...r,
          sportRole: updated.sportRole,
          sportRoleVariant: updated.sportRoleVariant,
          gender: updated.gender,
          birthDate: updated.birthDate,
          sportRoleHistory:
            updated.sportRole !== editRow.sportRole && updated.sportRole !== null
              ? [{ sportRole: updated.sportRole, changedAt: new Date().toISOString() }, ...editRow.sportRoleHistory]
              : editRow.sportRoleHistory,
        } : r));
      } else {
        setRows((prev) => prev.map((r) => r.id === editRow.id && r.kind === "child" ? {
          ...r,
          sportRole: updated.sportRole,
          sportRoleVariant: updated.sportRoleVariant,
          gender: updated.gender,
          birthDate: updated.birthDate,
        } : r));
      }
      showToast({ message: "Dati atleta aggiornati", severity: "success" });
      setEditRow(null);
    } else {
      showToast({ message: "Errore nel salvataggio", severity: "error" });
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteRow) return;
    setDeleting(true);
    const url = deleteRow.kind === "user"
      ? `/api/users/${deleteRow.id}`
      : `/api/children/${deleteRow.id}`;
    try {
      const res = await fetch(url, { method: "DELETE" });
      if (res.ok) {
        setRows((prev) => prev.filter((r) => r.id !== deleteRow.id));
        const label = deleteRow.kind === "user"
          ? `Utente "${deleteRow.name ?? deleteRow.email}" eliminato`
          : `Figlio "${deleteRow.name}" eliminato`;
        showToast({ message: label, severity: "success" });
        setDeleteRow(null);
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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Box>
      {/* ── Barra ricerca + info ── */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2, flexWrap: "wrap" }}>
        <TextField
          placeholder="Cerca per nome, email o genitore..."
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
        <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
          {processed.length !== rows.length
            ? `${processed.length} di ${rows.length} (${userCount} utenti + ${childCount} figli senza account)`
            : `${userCount} utenti + ${childCount} figli senza account`}
        </Typography>
        {activeFilterCount > 0 && (
          <Button size="small" onClick={resetFilters} startIcon={
            <Badge badgeContent={activeFilterCount} color="primary">
              <FilterListIcon fontSize="small" />
            </Badge>
          }>
            Rimuovi filtri
          </Button>
        )}
      </Box>

      {/* ── Filtri ── */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 2.5 }}>
        {/* Ruolo utente */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ minWidth: 90 }}>
            Ruolo utente
          </Typography>
          <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
            {ALL_APP_ROLES.map((role) => (
              <Chip
                key={role}
                label={ROLE_LABELS_IT[role]}
                size="small"
                color={filterAppRoles.includes(role) ? ROLE_CHIP_COLORS[role] : "default"}
                variant={filterAppRoles.includes(role) ? "filled" : "outlined"}
                onClick={() => toggleAppRole(role)}
                sx={{ cursor: "pointer", fontWeight: filterAppRoles.includes(role) ? 700 : 400 }}
              />
            ))}
          </Box>
        </Box>

        {/* Ruolo Baskin */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ minWidth: 90 }}>
            Ruolo Baskin
          </Typography>
          <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
            <Chip
              label="Non impostato"
              size="small"
              variant={filterSportRoles.includes("none") ? "filled" : "outlined"}
              onClick={() => toggleSportRole("none")}
              sx={{ cursor: "pointer", fontWeight: filterSportRoles.includes("none") ? 700 : 400 }}
            />
            {[1, 2, 3, 4, 5].map((r) => {
              const active = filterSportRoles.includes(r.toString());
              return (
                <Chip
                  key={r}
                  label={sportRoleLabel(r)}
                  size="small"
                  variant={active ? "filled" : "outlined"}
                  onClick={() => toggleSportRole(r.toString())}
                  sx={{
                    cursor: "pointer",
                    fontWeight: active ? 700 : 400,
                    bgcolor: active ? ROLE_COLORS[r] : undefined,
                    color: active ? "#fff" : undefined,
                    borderColor: active ? ROLE_COLORS[r] : undefined,
                  }}
                />
              );
            })}
          </Box>
        </Box>

        {/* Genere */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ minWidth: 90 }}>
            Genere
          </Typography>
          <ToggleButtonGroup
            value={filterGender}
            exclusive
            size="small"
            onChange={(_e, val) => { setFilterGender(val ?? ""); setPage(0); }}
          >
            <ToggleButton value="" sx={{ px: 1.5, fontSize: "0.75rem" }}>Tutti</ToggleButton>
            <ToggleButton value="MALE" sx={{ px: 1.5, fontSize: "0.75rem" }}>M</ToggleButton>
            <ToggleButton value="FEMALE" sx={{ px: 1.5, fontSize: "0.75rem" }}>F</ToggleButton>
            <ToggleButton value="none" sx={{ px: 1.5, fontSize: "0.75rem" }}>N/D</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* ── Tabella ── */}
      <TableContainer component={Box} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={sortBy === "name"}
                  direction={sortBy === "name" ? sortDir : "asc"}
                  onClick={() => handleSort("name")}
                >
                  Utente
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Email / Genitore</TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === "appRole"}
                  direction={sortBy === "appRole" ? sortDir : "asc"}
                  onClick={() => handleSort("appRole")}
                >
                  Ruolo
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={sortBy === "sportRole"}
                  direction={sortBy === "sportRole" ? sortDir : "asc"}
                  onClick={() => handleSort("sportRole")}
                >
                  Baskin
                </TableSortLabel>
              </TableCell>
              <TableCell align="center" sx={{ display: { xs: "none", sm: "table-cell" } }}>Genere</TableCell>
              <TableCell align="center" sx={{ display: { xs: "none", sm: "table-cell" } }}>
                <TableSortLabel
                  active={sortBy === "createdAt"}
                  direction={sortBy === "createdAt" ? sortDir : "asc"}
                  onClick={() => handleSort("createdAt")}
                >
                  Iscritto il
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">Azioni</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.map((row) => (
              <TableRow
                key={`${row.kind}-${row.id}`}
                hover
                sx={row.kind === "child" ? { bgcolor: "action.hover" } : undefined}
              >
                {/* Utente / Nome */}
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Avatar
                      src={row.kind === "user" ? (row.image ?? undefined) : undefined}
                      sx={{ width: 30, height: 30, fontSize: 13, bgcolor: row.kind === "child" ? "grey.400" : undefined }}
                    >
                      {(row.name ?? "?")[0].toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {row.name ?? "—"}
                      </Typography>
                      {row.kind === "child" && (
                        <Chip
                          label="Senza account"
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: "0.63rem", height: 15, mt: 0.25 }}
                        />
                      )}
                    </Box>
                  </Box>
                </TableCell>

                {/* Email / Genitore */}
                <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                  {row.kind === "user"
                    ? <Typography variant="body2" color="text.secondary">{row.email}</Typography>
                    : <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
                        Figlio di {row.parent.name ?? row.parent.email}
                      </Typography>
                  }
                </TableCell>

                {/* Ruolo utente */}
                <TableCell>
                  {row.kind === "user"
                    ? <Select
                        value={row.appRole}
                        size="small"
                        onChange={(e) => handleRoleChange(row.id, e.target.value as AppRole)}
                        sx={{ minWidth: 110, fontSize: "0.8rem" }}
                        renderValue={(val) => (
                          <Chip label={ROLE_LABELS_IT[val as AppRole]} size="small" color={ROLE_CHIP_COLORS[val as AppRole]} sx={{ fontWeight: 600 }} />
                        )}
                      >
                        {ALL_APP_ROLES.map((r) => (
                          <MenuItem key={r} value={r}>
                            <Chip label={ROLE_LABELS_IT[r]} size="small" color={ROLE_CHIP_COLORS[r]} sx={{ fontWeight: 600 }} />
                          </MenuItem>
                        ))}
                      </Select>
                    : <Typography variant="body2" color="text.disabled" sx={{ pl: 0.5 }}>—</Typography>
                  }
                </TableCell>

                {/* Ruolo Baskin */}
                <TableCell align="center">
                  {row.sportRole
                    ? <Chip
                        label={sportRoleLabel(row.sportRole, row.sportRoleVariant)}
                        size="small"
                        sx={{ bgcolor: ROLE_COLORS[row.sportRole], color: "#fff", fontWeight: 700, fontSize: "0.72rem" }}
                      />
                    : row.kind === "user" && row.sportRoleSuggested
                      ? <Chip
                          label={`${sportRoleLabel(row.sportRoleSuggested, row.sportRoleSuggestedVariant)} ?`}
                          size="small"
                          variant="outlined"
                          sx={{ borderColor: ROLE_COLORS[row.sportRoleSuggested], color: ROLE_COLORS[row.sportRoleSuggested], fontWeight: 700, fontSize: "0.72rem" }}
                          title="Autovalutazione — da confermare"
                        />
                      : <Typography variant="body2" color="text.disabled">—</Typography>
                  }
                </TableCell>

                {/* Genere */}
                <TableCell align="center" sx={{ display: { xs: "none", sm: "table-cell" } }}>
                  {row.gender
                    ? <Typography variant="body2">{GENDER_LABELS_SHORT[row.gender]}</Typography>
                    : <Typography variant="body2" color="text.disabled">—</Typography>}
                </TableCell>

                {/* Iscritto il */}
                <TableCell align="center" sx={{ display: { xs: "none", sm: "table-cell" } }}>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {format(new Date(row.createdAt), "d MMM yyyy", { locale: it })}
                  </Typography>
                </TableCell>

                {/* Azioni */}
                <TableCell align="center">
                  <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5 }}>
                    <Tooltip title="Modifica dati atleta">
                      <IconButton size="small" onClick={() => openEdit(row)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={row.kind === "user" ? "Elimina utente" : "Elimina figlio"}>
                      <IconButton size="small" color="error" onClick={() => setDeleteRow(row)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}

            {paginated.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  {activeFilterCount > 0
                    ? "Nessun risultato corrisponde ai filtri selezionati."
                    : "Nessun utente trovato."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Paginazione ── */}
      <TablePagination
        component="div"
        count={processed.length}
        page={page}
        onPageChange={(_e, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
        rowsPerPageOptions={[10, 25, 50, 100]}
        labelRowsPerPage="Righe:"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} di ${count}`}
        sx={{ borderTop: "1px solid", borderColor: "divider" }}
      />

      {/* ── Dialog conferma eliminazione ── */}
      <Dialog open={!!deleteRow} onClose={() => !deleting && setDeleteRow(null)}>
        <DialogTitle>
          {deleteRow?.kind === "user" ? "Elimina utente" : "Elimina figlio"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Sei sicuro di voler eliminare{" "}
            <strong>
              {deleteRow?.kind === "user"
                ? (deleteRow.name ?? deleteRow.email)
                : deleteRow?.name}
            </strong>?
            {" "}Verranno eliminate anche tutte le iscrizioni associate. Questa azione è irreversibile.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteRow(null)} disabled={deleting}>Annulla</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={deleting}>
            {deleting ? "Eliminazione..." : "Elimina"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog modifica atleta ── */}
      <Dialog open={!!editRow} onClose={() => setEditRow(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Dati atleta — {editRow?.name ?? (editRow?.kind === "user" ? editRow.email : "")}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {/* Ruolo Baskin */}
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" gutterBottom>
                Ruolo Baskin (1–5)
              </Typography>
              {editRow?.kind === "user" && editRow.sportRoleSuggested && !editRow.sportRole && (
                <Typography variant="caption" color="warning.main" display="block" sx={{ mb: 0.5 }}>
                  Autovalutazione: {sportRoleLabel(editRow.sportRoleSuggested, editRow.sportRoleSuggestedVariant)}
                  {editRow.sportRoleSuggestedVariant
                    ? ` — ${SPORT_ROLE_VARIANT_LABELS[editRow.sportRoleSuggestedVariant] ?? ""}`
                    : ""}
                </Typography>
              )}
              <Select
                fullWidth size="small" displayEmpty
                value={editState.sportRole}
                onChange={(e) => setEditState((s) => ({ ...s, sportRole: e.target.value, sportRoleVariant: "" }))}
              >
                <MenuItem value=""><em>Non impostato</em></MenuItem>
                {[1, 2, 3, 4, 5].map((r) => (
                  <MenuItem key={r} value={r.toString()}>
                    <Chip label={sportRoleLabel(r)} size="small" sx={{ bgcolor: ROLE_COLORS[r], color: "#fff", fontWeight: 700, fontSize: "0.72rem" }} />
                  </MenuItem>
                ))}
              </Select>
            </Box>

            {/* Variante ruolo (solo 1 o 2) */}
            {["1", "2"].includes(editState.sportRole) && (
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" gutterBottom>
                  Variante ruolo
                </Typography>
                <Select
                  fullWidth size="small" displayEmpty
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
                fullWidth size="small" displayEmpty
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
                fullWidth size="small" type="date"
                value={editState.birthDate}
                onChange={(e) => setEditState((s) => ({ ...s, birthDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Box>

            {/* Storico ruolo (solo utenti con account) */}
            {editRow?.kind === "user" && editRow.sportRoleHistory.length > 0 && (
              <Box>
                <Divider sx={{ mb: 1.5 }} />
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
                  <HistoryIcon fontSize="small" color="action" />
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Storico ruolo Baskin
                  </Typography>
                </Box>
                <Stack spacing={0.5}>
                  {editRow.sportRoleHistory.map((h, i) => (
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
          <Button onClick={() => setEditRow(null)}>Annulla</Button>
          <Button variant="contained" onClick={handleSaveAthleteData} disabled={saving}>
            {saving ? "Salvataggio..." : "Salva"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
