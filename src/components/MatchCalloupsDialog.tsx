"use client";

import { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, CircularProgress, Typography, Box, Checkbox,
  FormControlLabel, Chip, Divider, Alert,
} from "@mui/material";
import GroupsIcon from "@mui/icons-material/Groups";
import { ROLE_COLORS, ROLE_LABELS, sportRoleLabel } from "@/lib/constants";

interface Member {
  id: string;
  userId: string | null;
  childId: string | null;
  isCaptain: boolean;
  user: { id: string; name: string | null; sportRole: number | null; sportRoleVariant: string | null } | null;
  child: { id: string; name: string; sportRole: number | null; sportRoleVariant: string | null } | null;
}

interface Callup {
  id: string;
  userId: string | null;
  childId: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  matchId: string;
  teamId: string;
  matchLabel: string;
}

export default function MatchCalloupsDialog({ open, onClose, matchId, teamId, matchLabel }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [selectedChildIds, setSelectedChildIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError("");
    setLoading(true);

    Promise.all([
      fetch(`/api/competitive-teams/${teamId}`).then((r) => r.json()),
      fetch(`/api/matches/${matchId}/callups`).then((r) => r.json()),
    ])
      .then(([teamData, callups]: [{ memberships: Member[] }, Callup[]]) => {
        setMembers(teamData.memberships ?? []);
        const uIds = new Set(callups.filter((c) => c.userId).map((c) => c.userId!));
        const cIds = new Set(callups.filter((c) => c.childId).map((c) => c.childId!));
        setSelectedUserIds(uIds);
        setSelectedChildIds(cIds);
      })
      .catch(() => setError("Errore nel caricamento dei dati"))
      .finally(() => setLoading(false));
  }, [open, matchId, teamId]);

  function toggleUser(userId: string) {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  }

  function toggleChild(childId: string) {
    setSelectedChildIds((prev) => {
      const next = new Set(prev);
      next.has(childId) ? next.delete(childId) : next.add(childId);
      return next;
    });
  }

  function selectAll() {
    setSelectedUserIds(new Set(members.filter((m) => m.userId).map((m) => m.userId!)));
    setSelectedChildIds(new Set(members.filter((m) => m.childId).map((m) => m.childId!)));
  }

  function clearAll() {
    setSelectedUserIds(new Set());
    setSelectedChildIds(new Set());
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/matches/${matchId}/callups`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: [...selectedUserIds],
          childIds: [...selectedChildIds],
        }),
      });
      if (!res.ok) {
        setError("Errore nel salvataggio");
        return;
      }
      onClose();
    } catch {
      setError("Errore di rete");
    } finally {
      setSaving(false);
    }
  }

  const totalSelected = selectedUserIds.size + selectedChildIds.size;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 700 }}>
        <GroupsIcon color="primary" />
        Convocati
        <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
          — {matchLabel}
        </Typography>
      </DialogTitle>

      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : members.length === 0 ? (
          <Typography color="text.secondary">Nessun membro nella rosa di questa squadra.</Typography>
        ) : (
          <>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
              <Chip
                label={`${totalSelected} convocati`}
                color="primary"
                size="small"
                sx={{ fontWeight: 700 }}
              />
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button size="small" onClick={selectAll}>Tutti</Button>
                <Button size="small" color="inherit" onClick={clearAll}>Nessuno</Button>
              </Box>
            </Box>
            <Divider sx={{ mb: 1.5 }} />

            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              {members.map((m) => {
                const person = m.user ?? m.child;
                if (!person) return null;
                const isUser = !!m.userId;
                const isSelected = isUser
                  ? selectedUserIds.has(m.userId!)
                  : selectedChildIds.has(m.childId!);
                const role = person.sportRole;
                const roleLabel = role
                  ? sportRoleLabel(role, (person as { sportRoleVariant?: string | null }).sportRoleVariant ?? null)
                  : null;

                return (
                  <FormControlLabel
                    key={m.id}
                    control={
                      <Checkbox
                        checked={isSelected}
                        onChange={() => isUser ? toggleUser(m.userId!) : toggleChild(m.childId!)}
                        size="small"
                      />
                    }
                    label={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography variant="body2" fontWeight={isSelected ? 700 : 400}>
                          {person.name}
                          {m.isCaptain && " ★"}
                        </Typography>
                        {roleLabel && role && (
                          <Chip
                            label={roleLabel}
                            size="small"
                            sx={{ bgcolor: ROLE_COLORS[role], color: "#fff", fontWeight: 600, fontSize: "0.65rem", height: 18 }}
                          />
                        )}
                      </Box>
                    }
                    sx={{ mx: 0, py: 0.25 }}
                  />
                );
              })}
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>Annulla</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || loading}
          startIcon={saving ? <CircularProgress size={16} /> : undefined}
        >
          Salva convocati
        </Button>
      </DialogActions>
    </Dialog>
  );
}
