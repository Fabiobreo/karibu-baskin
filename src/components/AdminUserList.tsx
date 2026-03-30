"use client";
import { useState } from "react";
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Avatar, Typography, Select, MenuItem, Chip,
  TextField, InputAdornment,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import type { AppRole } from "@prisma/client";
import { ROLE_LABELS_IT } from "@/lib/authRoles";
import { useToast } from "@/context/ToastContext";

const ROLE_COLORS: Record<AppRole, "default" | "warning" | "info" | "success" | "error"> = {
  GUEST: "default",
  ATHLETE: "info",
  PARENT: "success",
  COACH: "warning",
  ADMIN: "error",
};

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  appRole: AppRole;
  createdAt: Date | string;
  _count: { registrations: number };
}

export default function AdminUserList({ users: initialUsers }: { users: User[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
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
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, appRole: newRole } : u))
      );
      showToast({ message: `Ruolo aggiornato a ${ROLE_LABELS_IT[newRole]}`, severity: "success" });
    } else {
      showToast({ message: "Errore nell'aggiornamento del ruolo", severity: "error" });
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
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Utente</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Ruolo</TableCell>
              <TableCell align="center">Iscrizioni</TableCell>
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
                    <Typography variant="body2" fontWeight={600}>
                      {user.name ?? "—"}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {user.email}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Select
                    value={user.appRole}
                    size="small"
                    onChange={(e) => handleRoleChange(user.id, e.target.value as AppRole)}
                    sx={{ minWidth: 130, fontSize: "0.8rem" }}
                    renderValue={(val) => (
                      <Chip
                        label={ROLE_LABELS_IT[val as AppRole]}
                        size="small"
                        color={ROLE_COLORS[val as AppRole]}
                        sx={{ fontWeight: 600 }}
                      />
                    )}
                  >
                    {(["GUEST", "ATHLETE", "PARENT", "COACH", "ADMIN"] as AppRole[]).map((r) => (
                      <MenuItem key={r} value={r}>
                        <Chip label={ROLE_LABELS_IT[r]} size="small" color={ROLE_COLORS[r]} sx={{ fontWeight: 600 }} />
                      </MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2">{user._count.registrations}</Typography>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  Nessun utente trovato
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
