"use client";
import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { AppRole } from "@prisma/client";
import { ROLE_LABELS_IT, ROLE_CHIP_COLORS } from "@/lib/authRoles";
import {
  ROLE_COLORS,
  SPORT_ROLE_VARIANT_LABELS,
  sportRoleLabel,
  ATHLETE_STATUS_LABELS,
} from "@/lib/constants";
import { useToast } from "@/context/ToastContext";
import type {
  AdminRow,
  MembershipInfo,
  TeamInfo,
  UserEntry,
} from "@/components/admin/userList/userListShared";

interface EditState {
  name: string;
  email: string;
  appRole: string;
  sportRole: string;
  sportRoleVariant: string;
  gender: string;
  birthDate: string;
  athleteStatus: string; // "" = attivo
}

interface UserEditDialogProps {
  row: AdminRow;
  isAdmin: boolean;
  teams: TeamInfo[];
  currentSeason: string;
  onClose: () => void;
  /** Riceve la riga aggiornata (dati + membership squadra) da applicare alla lista. */
  onSaved: (updated: AdminRow) => void;
}

/**
 * Dialog di modifica utente/figlio — autonomo: stato e salvataggio interni
 * (PATCH dati + eventuale cambio squadra), montare solo quando aperto.
 */
export default function UserEditDialog({
  row,
  isAdmin,
  teams,
  currentSeason,
  onClose,
  onSaved,
}: UserEditDialogProps) {
  const { showToast } = useToast();

  const [editState, setEditState] = useState<EditState>({
    name: row.name ?? "",
    email: row.kind === "user" ? (row.email ?? "") : "",
    appRole: row.kind === "user" ? row.appRole : "",
    sportRole: row.sportRole?.toString() ?? "",
    sportRoleVariant: row.sportRoleVariant ?? "",
    gender: row.gender ?? "",
    birthDate: row.birthDate ? new Date(row.birthDate).toISOString().slice(0, 10) : "",
    athleteStatus: row.athleteStatus ?? "",
  });
  const [editTeamId, setEditTeamId] = useState(
    row.teamMemberships.find((m) => m.team.season === currentSeason)?.teamId ?? ""
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const payload: Record<string, unknown> = {
      sportRole: editState.sportRole ? parseInt(editState.sportRole) : null,
      sportRoleVariant: editState.sportRoleVariant || null,
      gender: editState.gender || null,
      birthDate: editState.birthDate || null,
      athleteStatus: editState.athleteStatus || null,
    };
    if (editState.name.trim()) payload.name = editState.name.trim();
    if (row.kind === "user" && editState.appRole) {
      payload.appRole = editState.appRole;
    }
    if (row.kind === "user" && editState.email.trim() && editState.email.trim() !== row.email) {
      payload.email = editState.email.trim();
    }
    const url = row.kind === "user" ? `/api/users/${row.id}` : `/api/children/${row.id}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      setSaving(false);
      showToast({ message: "Errore nel salvataggio", severity: "error" });
      return;
    }

    const updated = await res.json();
    const existingMembership = row.teamMemberships.find((m) => m.team.season === currentSeason);
    const previousTeamId = existingMembership?.teamId ?? "";

    // Gestione cambio squadra (stagione corrente)
    let newMembership: MembershipInfo | null = null;
    if (editTeamId !== previousTeamId) {
      try {
        if (existingMembership) {
          await fetch(
            `/api/competitive-teams/${existingMembership.teamId}/members/${existingMembership.id}`,
            { method: "DELETE" }
          );
        }
        if (editTeamId) {
          const memberBody = row.kind === "user" ? { userId: row.id } : { childId: row.id };
          const memberRes = await fetch(`/api/competitive-teams/${editTeamId}/members`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(memberBody),
          });
          if (memberRes.ok) {
            const memberData = await memberRes.json();
            const teamInfo = teams.find((t) => t.id === editTeamId);
            if (teamInfo)
              newMembership = {
                id: memberData.id,
                teamId: editTeamId,
                isCaptain: false,
                team: teamInfo,
              };
          } else {
            showToast({ message: "Errore nell'assegnazione alla squadra", severity: "warning" });
          }
        }
      } catch {
        showToast({ message: "Errore nella gestione della squadra", severity: "warning" });
      }
    } else {
      newMembership = existingMembership ?? null;
    }

    // Costruisce la riga aggiornata da applicare alla lista
    const otherMemberships = row.teamMemberships.filter((m) => m.team.season !== currentSeason);
    const teamMemberships = newMembership ? [...otherMemberships, newMembership] : otherMemberships;

    let updatedRow: AdminRow;
    if (row.kind === "user") {
      updatedRow = {
        ...row,
        teamMemberships,
        name: updated.name ?? row.name,
        email: updated.email ?? row.email,
        appRole: updated.appRole ?? row.appRole,
        sportRole: updated.sportRole,
        sportRoleVariant: updated.sportRoleVariant,
        gender: updated.gender,
        birthDate: updated.birthDate,
        athleteStatus: updated.athleteStatus ?? null,
        sportRoleHistory:
          updated.sportRole !== row.sportRole && updated.sportRole !== null
            ? [
                { sportRole: updated.sportRole, changedAt: new Date().toISOString() },
                ...row.sportRoleHistory,
              ]
            : row.sportRoleHistory,
      };
    } else {
      updatedRow = {
        ...row,
        teamMemberships,
        name: updated.name ?? row.name,
        sportRole: updated.sportRole,
        sportRoleVariant: updated.sportRoleVariant,
        gender: updated.gender,
        birthDate: updated.birthDate,
        athleteStatus: updated.athleteStatus ?? null,
      };
    }

    setSaving(false);
    showToast({ message: "Dati atleta aggiornati", severity: "success" });
    onSaved(updatedRow);
    onClose();
  }

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        Modifica {row.name ?? (row.kind === "user" ? row.email : "")}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          {/* Nome */}
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
              display="block"
              gutterBottom
            >
              Nome completo
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={editState.name}
              onChange={(e) => setEditState((s) => ({ ...s, name: e.target.value }))}
              inputProps={{ maxLength: 100 }}
              placeholder="Es. Mario Rossi"
              disabled={!isAdmin}
            />
          </Box>

          {/* Email (solo utenti) */}
          {row.kind === "user" && (
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
                display="block"
                gutterBottom
              >
                Email
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="email"
                value={editState.email}
                onChange={(e) => setEditState((s) => ({ ...s, email: e.target.value }))}
                inputProps={{ maxLength: 254 }}
                disabled={!isAdmin}
              />
            </Box>
          )}

          {/* Genere */}
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
              display="block"
              gutterBottom
            >
              Genere
            </Typography>
            <Select
              fullWidth
              size="small"
              displayEmpty
              value={editState.gender}
              onChange={(e) => setEditState((s) => ({ ...s, gender: e.target.value }))}
            >
              <MenuItem value="">
                <em>Non impostato</em>
              </MenuItem>
              <MenuItem value="MALE">Maschio</MenuItem>
              <MenuItem value="FEMALE">Femmina</MenuItem>
            </Select>
          </Box>

          {/* Data di nascita */}
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
              display="block"
              gutterBottom
            >
              Data di nascita (opzionale)
            </Typography>
            <TextField
              fullWidth
              size="small"
              type="date"
              value={editState.birthDate}
              onChange={(e) => setEditState((s) => ({ ...s, birthDate: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Box>

          {/* Stato atleta */}
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
              display="block"
              gutterBottom
            >
              Stato atleta
            </Typography>
            <Select
              fullWidth
              size="small"
              displayEmpty
              value={editState.athleteStatus}
              onChange={(e) => setEditState((s) => ({ ...s, athleteStatus: e.target.value }))}
            >
              <MenuItem value="">
                <em>Attivo</em>
              </MenuItem>
              <MenuItem value="INACTIVE_SEASON">{ATHLETE_STATUS_LABELS.INACTIVE_SEASON}</MenuItem>
              <MenuItem value="FORMER">{ATHLETE_STATUS_LABELS.FORMER}</MenuItem>
            </Select>
          </Box>

          <Divider />

          {/* Ruolo utente (solo per User con account) */}
          {row.kind === "user" && (
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
                display="block"
                gutterBottom
              >
                Ruolo utente
              </Typography>
              <Select
                fullWidth
                size="small"
                value={editState.appRole}
                onChange={(e) => setEditState((s) => ({ ...s, appRole: e.target.value }))}
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
            </Box>
          )}

          {/* Ruolo Baskin */}
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
              display="block"
              gutterBottom
            >
              Ruolo Baskin (1–5)
            </Typography>
            {row.kind === "user" && row.sportRoleSuggested && !row.sportRole && (
              <Typography variant="caption" color="warning.main" display="block" sx={{ mb: 0.5 }}>
                Autovalutazione:{" "}
                {sportRoleLabel(row.sportRoleSuggested, row.sportRoleSuggestedVariant)}
                {row.sportRoleSuggestedVariant
                  ? ` · ${SPORT_ROLE_VARIANT_LABELS[row.sportRoleSuggestedVariant] ?? ""}`
                  : ""}
              </Typography>
            )}
            <Select
              fullWidth
              size="small"
              displayEmpty
              value={editState.sportRole}
              onChange={(e) =>
                setEditState((s) => ({ ...s, sportRole: e.target.value, sportRoleVariant: "" }))
              }
            >
              <MenuItem value="">
                <em>Non impostato</em>
              </MenuItem>
              {[1, 2, 3, 4, 5].map((r) => (
                <MenuItem key={r} value={r.toString()}>
                  <Chip
                    label={sportRoleLabel(r)}
                    size="small"
                    sx={{
                      bgcolor: ROLE_COLORS[r],
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: "0.72rem",
                    }}
                  />
                </MenuItem>
              ))}
            </Select>
          </Box>

          {/* Variante ruolo (solo 1 o 2) */}
          {["1", "2"].includes(editState.sportRole) && (
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
                display="block"
                gutterBottom
              >
                Variante ruolo
              </Typography>
              <Select
                fullWidth
                size="small"
                displayEmpty
                value={editState.sportRoleVariant}
                onChange={(e) => setEditState((s) => ({ ...s, sportRoleVariant: e.target.value }))}
              >
                <MenuItem value="">
                  <em>Nessuna variante (standard)</em>
                </MenuItem>
                {editState.sportRole === "1" && (
                  <MenuItem value="S">S · {SPORT_ROLE_VARIANT_LABELS["S"]}</MenuItem>
                )}
                {editState.sportRole === "2" && [
                  <MenuItem key="T" value="T">
                    T · {SPORT_ROLE_VARIANT_LABELS["T"]}
                  </MenuItem>,
                  <MenuItem key="P" value="P">
                    P · {SPORT_ROLE_VARIANT_LABELS["P"]}
                  </MenuItem>,
                  <MenuItem key="R" value="R">
                    R · {SPORT_ROLE_VARIANT_LABELS["R"]}
                  </MenuItem>,
                ]}
              </Select>
            </Box>
          )}

          <Divider />

          {/* Squadra stagione corrente */}
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
              display="block"
              gutterBottom
            >
              Squadra ({currentSeason})
            </Typography>
            {teams.length === 0 ? (
              <Typography variant="body2" color="text.secondary" fontStyle="italic">
                Nessuna squadra per la stagione corrente
              </Typography>
            ) : (
              <Select
                fullWidth
                size="small"
                displayEmpty
                value={editTeamId}
                onChange={(e) => setEditTeamId(e.target.value)}
              >
                <MenuItem value="">
                  <em>Nessuna squadra</em>
                </MenuItem>
                {teams.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {t.color && (
                        <Box
                          component="span"
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            bgcolor: t.color,
                            flexShrink: 0,
                          }}
                        />
                      )}
                      {t.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            )}
          </Box>

          {/* Storico ruolo (solo utenti con account) */}
          {row.kind === "user" && row.sportRoleHistory.length > 0 && (
            <Box>
              <Divider sx={{ mb: 1.5 }} />
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
                <HistoryIcon fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Storico ruolo Baskin
                </Typography>
              </Box>
              <Stack spacing={0.5}>
                {row.sportRoleHistory.map((h, i) => (
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
        <Button onClick={onClose}>Annulla</Button>
        <Button variant="contained" size="large" onClick={handleSave} disabled={saving}>
          {saving ? "Salvataggio..." : "Salva"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
