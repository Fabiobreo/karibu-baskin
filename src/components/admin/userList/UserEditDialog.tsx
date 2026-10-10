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
import ChildCareIcon from "@mui/icons-material/ChildCare";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import MergeIcon from "@mui/icons-material/Merge";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { AppRole } from "@prisma/client";
import { SPORT_ROLE_VARIANT_LABELS, sportRoleLabel, ATHLETE_STATUS_LABELS } from "@/lib/constants";
import RoleBadge from "@/components/common/RoleBadge";
import { useToast } from "@/context/ToastContext";
import { assignableAppRoles } from "@/lib/authRoles";
import { readError } from "@/lib/fetchJson";
import {
  AppRoleChip,
  type AdminRow,
  type MembershipInfo,
  type TeamInfo,
  type UserEntry,
} from "@/components/admin/userList/userListShared";
import TeamColorDot from "@/components/teams/TeamColorDot";
import ChildGuardiansSection from "@/components/admin/userList/ChildGuardiansSection";
import ChildAccountSection from "@/components/admin/userList/ChildAccountSection";
import { FONT_WEIGHT } from "@/lib/fontWeight";

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
  /** Chi sta guardando: nessuno cambia il proprio ruolo utente. */
  currentUserId?: string | null;
  teams: TeamInfo[];
  currentSeason: string;
  onClose: () => void;
  /** Riceve la riga aggiornata (dati + membership squadra) da applicare alla lista. */
  onSaved: (updated: AdminRow) => void;
  /** Apre l'unione di questo account in attesa con una scheda già in elenco (solo admin). */
  onMerge?: (row: UserEntry & { kind: "user" }) => void;
  /** Scheda figlio collegata o scollegata da un account: la lista va riletta. */
  onLinkChanged?: () => void;
}

/**
 * Dialog di modifica utente/figlio — autonomo: stato e salvataggio interni
 * (PATCH dati + eventuale cambio squadra), montare solo quando aperto.
 */
export default function UserEditDialog({
  row,
  isAdmin,
  currentUserId = null,
  teams,
  currentSeason,
  onClose,
  onSaved,
  onMerge,
  onLinkChanged,
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

  // I ruoli utente fra cui chi guarda può scegliere (stessa regola dell'API):
  // l'allenatore approva solo gli ospiti, nessuno cambia il proprio.
  const roleOptions =
    row.kind === "user"
      ? assignableAppRoles({
          actorRole: isAdmin ? "ADMIN" : "COACH",
          isSelf: row.id === currentUserId,
          current: row.appRole,
        })
      : [];

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
    if (row.kind === "user" && editState.appRole && editState.appRole !== row.appRole) {
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
      const message = await readError(res);
      setSaving(false);
      showToast({ message, severity: "error" });
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
      <DialogTitle sx={{ fontWeight: FONT_WEIGHT.semibold }}>
        Modifica {row.name ?? (row.kind === "user" ? row.email : "")}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          {/* Nome */}
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={FONT_WEIGHT.semibold}
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

          {/* Genitori (solo figli): effetto immediato, non aspettano Salva */}
          {row.kind === "child" && (
            <ChildGuardiansSection
              childId={row.id}
              childName={row.name}
              guardians={row.guardians}
              onChange={(guardians) => onSaved({ ...row, guardians })}
            />
          )}

          {/* Account del figlio: anche questo ha effetto immediato */}
          {row.kind === "child" && onLinkChanged && (
            <ChildAccountSection
              childId={row.id}
              childName={row.name}
              linked={false}
              label="Account"
              excludeIds={row.guardians.map((g) => g.id)}
              onChanged={onLinkChanged}
            />
          )}
          {row.kind === "user" && row.linkedChild && onLinkChanged && (
            <ChildAccountSection
              childId={row.linkedChild.id}
              childName={row.linkedChild.name}
              linked
              label="Scheda figlio collegata"
              onChanged={onLinkChanged}
            />
          )}

          {/* Doppione di una scheda creata con l'email sbagliata (solo admin) */}
          {row.kind === "user" &&
            row.appRole === "GUEST" &&
            isAdmin &&
            row.id !== currentUserId &&
            onMerge && (
              <Box>
                <Button
                  variant="outlined"
                  startIcon={<MergeIcon />}
                  onClick={() => onMerge(row)}
                  sx={{ minHeight: 44 }}
                >
                  È già in elenco? Unisci
                </Button>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  sx={{ mt: 0.5 }}
                >
                  Se la sua scheda esiste già con un&apos;email sbagliata, questo accesso passa a
                  quella scheda.
                </Typography>
              </Box>
            )}

          {/* Email (solo utenti) */}
          {row.kind === "user" && (
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={FONT_WEIGHT.semibold}
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
              fontWeight={FONT_WEIGHT.semibold}
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
              fontWeight={FONT_WEIGHT.semibold}
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
              fontWeight={FONT_WEIGHT.semibold}
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
                fontWeight={FONT_WEIGHT.semibold}
                display="block"
                gutterBottom
              >
                Ruolo utente
              </Typography>
              <Select
                fullWidth
                size="small"
                value={editState.appRole}
                disabled={roleOptions.length <= 1}
                inputProps={{ "aria-label": "Ruolo utente" }}
                onChange={(e) => setEditState((s) => ({ ...s, appRole: e.target.value }))}
                renderValue={(val) => <AppRoleChip role={val as AppRole} />}
              >
                {roleOptions.map((r) => (
                  <MenuItem key={r} value={r}>
                    <AppRoleChip role={r} />
                  </MenuItem>
                ))}
              </Select>
              {roleOptions.length <= 1 && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  sx={{ mt: 0.5 }}
                >
                  {row.id === currentUserId
                    ? "Il proprio ruolo non si cambia: lo fa un altro admin."
                    : "Il ruolo utente lo cambia un admin."}
                </Typography>
              )}
            </Box>
          )}

          {/* Ruolo Baskin */}
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={FONT_WEIGHT.semibold}
              display="block"
              gutterBottom
            >
              Ruolo Baskin (1–5)
            </Typography>
            {row.kind === "user" && row.sportRoleSuggested && !row.sportRole && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                Autovalutazione da confermare:{" "}
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
                  <RoleBadge role={r} />
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
                fontWeight={FONT_WEIGHT.semibold}
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
              fontWeight={FONT_WEIGHT.semibold}
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
                disabled={!isAdmin}
                inputProps={{ "aria-label": "Squadra" }}
                onChange={(e) => setEditTeamId(e.target.value)}
              >
                <MenuItem value="">
                  <em>Nessuna squadra</em>
                </MenuItem>
                {teams.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <TeamColorDot color={t.color} size={12} />
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
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={FONT_WEIGHT.semibold}
                >
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
      <DialogActions sx={{ px: 3, pb: 2, flexWrap: "wrap", gap: 1 }}>
        {/* Scorciatoia per il backfill: il genitore arriva già scelto. */}
        {row.kind === "user" && (
          <Button
            href={`/admin/utenti/nuovo-figlio?parentId=${row.id}`}
            startIcon={<ChildCareIcon />}
          >
            Aggiungi figlio
          </Button>
        )}
        {/* Profilo giocatore: lo staff lo apre anche quando non è pubblico
            (genitori che non giocano), e da lì raggiunge i figli. */}
        <Button
          href={`/giocatori/${row.id}`}
          target="_blank"
          startIcon={<OpenInNewIcon />}
          sx={{ mr: "auto" }}
        >
          Profilo
        </Button>
        <Button onClick={onClose}>Annulla</Button>
        <Button variant="contained" size="large" onClick={handleSave} disabled={saving}>
          {saving ? "Salvataggio..." : "Salva"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
