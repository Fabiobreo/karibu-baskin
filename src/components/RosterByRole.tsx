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
}

interface Props {
  registrations: Registration[];
  currentUserId?: string | null;
  isStaff?: boolean; // coach o admin: può cancellare chiunque
  onUnregistered?: () => void;
}

export default function RosterByRole({ registrations, currentUserId, isStaff, onUnregistered }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { showToast } = useToast();

  async function handleUnregister(reg: Registration) {
    setDeletingId(reg.id);
    try {
      const res = await fetch(`/api/registrations/${reg.id}`, { method: "DELETE" });
      if (res.ok) {
        const msg = isStaff && reg.userId !== currentUserId
          ? `${reg.name} rimosso dall'allenamento`
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

      <Box sx={{ px: 2, pt: 1.5, pb: 2 }}>
        {ROLES.map((role) => {
          const group = registrations.filter((r) => r.role === role);
          if (group.length === 0) return null;
          return (
            <Box key={role} sx={{ mb: 1.5 }}>
              <Box sx={{ display: "inline-flex", alignItems: "center", mb: 0.8, borderRadius: "16px", overflow: "hidden", bgcolor: ROLE_COLORS[role], color: "#fff", fontSize: "0.8rem", lineHeight: 1 }}>
                <Box sx={{ px: 1.25, py: "5px", fontWeight: 700 }}>
                  {ROLE_LABELS[role]}
                </Box>
                <Box sx={{ px: 1.25, py: "5px", fontWeight: 400, bgcolor: "rgba(0,0,0,0.22)" }}>
                  {group.length} giocator{group.length > 1 ? "i" : "e"}
                </Box>
              </Box>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8, pl: 0.3 }}>
                {group.map((reg) => {
                  const isOwn = !!currentUserId && reg.userId === currentUserId;
                  const canDelete = isOwn || isStaff;
                  const isDeleting = deletingId === reg.id;
                  return (
                    <Chip
                      key={reg.id}
                      label={isDeleting ? <CircularProgress size={12} color="inherit" /> : reg.name}
                      size="small"
                      variant={isOwn ? "filled" : "outlined"}
                      onDelete={canDelete && !isDeleting ? () => handleUnregister(reg) : undefined}
                      disabled={isDeleting}
                      title={isOwn ? "Clicca × per disiscriverti" : isStaff ? `Rimuovi ${reg.name}` : undefined}
                      sx={isOwn ? {
                        backgroundColor: ROLE_COLORS[role],
                        color: "#fff",
                        fontWeight: 700,
                        outline: "1px solid",
                        outlineColor: ROLE_COLORS[role],
                        outlineOffset: "2px",
                        "& .MuiChip-deleteIcon": { color: "rgba(255,255,255,0.8)", "&:hover": { color: "#fff" } },
                      } : undefined}
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
