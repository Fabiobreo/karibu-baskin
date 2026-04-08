"use client";
import { useState } from "react";
import { Box, Typography, Chip, CircularProgress, Paper } from "@mui/material";
import { ROLE_LABELS, ROLE_COLORS, ROLES } from "@/lib/constants";
import { useToast } from "@/context/ToastContext";

interface Registration {
  id: string;
  name: string;
  role: number;
  createdAt: string | Date;
  sessionId: string;
  userId: string | null;
  childId?: string | null;
}

interface Props {
  registrations: Registration[];
  currentUserId?: string | null;
  linkedChildId?: string | null;   // Child.id collegato all'account dell'atleta loggato
  parentChildIds?: string[];       // Child.id dei figli del genitore
  childUserIds?: string[];         // userId dei figli del genitore (per reg. fatte con account proprio)
  isStaff?: boolean;
  onUnregistered?: () => void;
}

export default function RosterByRole({ registrations, currentUserId, linkedChildId, parentChildIds = [], childUserIds = [], isStaff, onUnregistered }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { showToast } = useToast();

  async function handleUnregister(reg: Registration) {
    setDeletingId(reg.id);
    try {
      const res = await fetch(`/api/registrations/${reg.id}`, { method: "DELETE" });
      if (res.ok) {
        const isOwnChild =
          (!!reg.childId && (parentChildIds.includes(reg.childId) || reg.childId === linkedChildId)) ||
          (!!reg.userId && childUserIds.includes(reg.userId));
        const msg = (isStaff && reg.userId !== currentUserId && !isOwnChild)
          ? `${reg.name} rimosso dall'allenamento`
          : isOwnChild && reg.childId !== linkedChildId
            ? `${reg.name} disiscritto/a`
            : "Disiscrizione effettuata";
        showToast({ message: msg, severity: "success" });
        onUnregistered?.();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast({ message: data.error ?? "Errore durante la disiscrizione", severity: "error" });
      }
    } catch {
      showToast({ message: "Errore di rete, riprova", severity: "error" });
    } finally {
      setDeletingId(null);
    }
  }

  // Only render columns for roles that have at least one registration
  const activeRoles = ROLES.filter((role) => registrations.some((r) => r.role === role));

  if (registrations.length === 0) {
    return (
      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, bgcolor: "primary.main", px: 2, py: 1.5 }}>
          <Typography variant="h6" sx={{ color: "#fff", fontWeight: 700, lineHeight: 1 }}>Iscritti</Typography>
          <Chip label="0 atleti" size="small" sx={{ bgcolor: "rgba(255,255,255,0.25)", color: "#fff", fontWeight: 600 }} />
        </Box>
        <Typography color="text.secondary" sx={{ px: 2, py: 2 }}>
          Nessun atleta iscritto ancora.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, bgcolor: "rgba(180,180,180)", px: 2, py: 1.5 }}>
        <Typography variant="h6" sx={{ color: "#fff", fontWeight: 700, lineHeight: 1 }}>
          Iscritti
        </Typography>
        <Chip
          label={`${registrations.length} atlet${registrations.length > 1 ? "i" : "a"}`}
          size="small"
          sx={{ bgcolor: "rgba(255,255,255,0.25)", color: "#fff", fontWeight: 600 }}
        />
      </Box>

      {/* Column grid — one column per active role */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: `repeat(${Math.min(activeRoles.length, 2)}, 1fr)`,
            sm: `repeat(${Math.min(activeRoles.length, 3)}, 1fr)`,
            md: `repeat(${activeRoles.length}, 1fr)`,
          },
          gap: "1px",
          bgcolor: "divider",
        }}
      >
        {activeRoles.map((role) => {
          const group = registrations.filter((r) => r.role === role);
          return (
            <Box
              key={role}
              sx={{ bgcolor: "background.paper", display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}
            >
              {/* Role header */}
              <Box
                sx={{
                  bgcolor: ROLE_COLORS[role],
                  px: 1.5,
                  py: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  overflow: "hidden",
                }}
              >
                <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: "0.82rem", lineHeight: 1 }}>
                  {ROLE_LABELS[role]}
                </Typography>
                <Typography sx={{ color: "rgba(255,255,255,0.75)", fontSize: "0.72rem", lineHeight: 1 }}>
                  {group.length}
                </Typography>
              </Box>

              {/* Athletes list */}
              <Box sx={{ px: 1.25, py: 1, display: "flex", flexDirection: "column", gap: 0.6 }}>
                {group.map((reg) => {
                  const isOwn = !!currentUserId && (
                    reg.userId === currentUserId ||
                    (!!linkedChildId && reg.childId === linkedChildId)
                  );
                  const isOwnChild =
                    (!!reg.childId && parentChildIds.includes(reg.childId)) ||
                    (!!reg.userId && childUserIds.includes(reg.userId));
                  const highlighted = isOwn || isOwnChild;
                  const canDelete = isOwn || isOwnChild || isStaff;
                  const isDeleting = deletingId === reg.id;
                  return (
                    <Chip
                      key={reg.id}
                      label={isDeleting ? <CircularProgress size={12} color="inherit" /> : reg.name}
                      size="small"
                      variant={highlighted ? "filled" : "outlined"}
                      onDelete={canDelete && !isDeleting ? () => handleUnregister(reg) : undefined}
                      disabled={isDeleting}
                      title={
                        isOwn ? "Clicca × per disiscriverti"
                        : isOwnChild ? `Disiscrivi ${reg.name}`
                        : isStaff ? `Rimuovi ${reg.name}`
                        : undefined
                      }
                      sx={{
                        width: "100%",
                        maxWidth: "100%",
                        justifyContent: "space-between",
                        "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 },
                        ...(highlighted ? {
                          backgroundColor: ROLE_COLORS[role],
                          color: "#fff",
                          fontWeight: 700,
                          outline: "1px solid",
                          outlineColor: ROLE_COLORS[role],
                          outlineOffset: "2px",
                          "& .MuiChip-deleteIcon": { color: "rgba(255,255,255,0.8)", "&:hover": { color: "#fff" } },
                        } : {}),
                      }}
                    />
                  );
                })}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}
