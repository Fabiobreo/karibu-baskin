"use client";
import { useState } from "react";
import { Box, Typography, Chip, CircularProgress } from "@mui/material";
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
      <Typography color="text.secondary" sx={{ py: 2 }}>
        Nessun atleta iscritto ancora.
      </Typography>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Iscritti —{" "}
        <Typography component="span" variant="h6" color="primary">
          {registrations.length} atleti
        </Typography>
      </Typography>

      {ROLES.map((role) => {
        const group = registrations.filter((r) => r.role === role);
        if (group.length === 0) return null;
        return (
          <Box key={role} sx={{ mb: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
              <Chip
                label={`${ROLE_LABELS[role]} (${group.length})`}
                size="small"
                sx={{ backgroundColor: ROLE_COLORS[role], color: "#fff", fontWeight: 700 }}
              />
            </Box>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, pl: 0.5 }}>
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
                    color={isOwn ? "primary" : "default"}
                    onDelete={canDelete && !isDeleting ? () => handleUnregister(reg) : undefined}
                    disabled={isDeleting}
                    title={isOwn ? "Clicca × per disiscriverti" : isStaff ? `Rimuovi ${reg.name}` : undefined}
                    sx={isOwn ? { fontWeight: 700 } : undefined}
                  />
                );
              })}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
