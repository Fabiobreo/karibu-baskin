"use client";
import { useState } from "react";
import { Avatar, Box, Button, Chip, CircularProgress, Paper, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useToast } from "@/context/ToastContext";

export interface GuestUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt: string | Date;
}

/**
 * Corsia rapida di approvazione dei nuovi account (GUEST): un click per
 * promuovere ad Atleta o Genitore, senza passare dalla scheda completa.
 */
export default function GuestApprovalInbox({ guests: initialGuests }: { guests: GuestUser[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [guests, setGuests] = useState(initialGuests);
  const [processing, setProcessing] = useState<string | null>(null);

  if (guests.length === 0) return null;

  async function approve(guest: GuestUser, appRole: "ATHLETE" | "PARENT") {
    setProcessing(guest.id);
    try {
      const res = await fetch(`/api/users/${guest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appRole }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        showToast({ message: data.error ?? "Errore nell'approvazione", severity: "error" });
        return;
      }
      setGuests((prev) => prev.filter((g) => g.id !== guest.id));
      showToast({
        message: `${guest.name ?? guest.email} approvato come ${appRole === "ATHLETE" ? "Atleta" : "Genitore"}`,
        severity: "success",
      });
      router.refresh();
    } catch {
      showToast({ message: "Errore di rete", severity: "error" });
    } finally {
      setProcessing(null);
    }
  }

  return (
    <Paper
      elevation={0}
      variant="outlined"
      sx={(theme) => ({
        p: 2.5,
        mb: 3,
        borderColor: "warning.main",
        bgcolor: alpha(theme.palette.warning.main, 0.05),
      })}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        <HowToRegIcon color="warning" />
        <Typography variant="subtitle1" fontWeight={700}>
          Nuovi account da approvare
        </Typography>
        <Chip label={guests.length} size="small" color="warning" sx={{ fontWeight: 700 }} />
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {guests.map((g) => {
          const busy = processing === g.id;
          return (
            <Box
              key={g.id}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                flexWrap: "wrap",
                p: 1,
                borderRadius: 1,
                bgcolor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Avatar src={g.image ?? undefined} sx={{ width: 34, height: 34, fontSize: 14 }}>
                {(g.name ?? g.email)[0]?.toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 140 }}>
                <Typography variant="body2" fontWeight={700} noWrap>
                  {g.name ?? "—"}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap display="block">
                  {g.email} · iscritto {format(new Date(g.createdAt), "d MMM yyyy", { locale: it })}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 0.75, alignItems: "center" }}>
                {busy && <CircularProgress size={16} />}
                <Button
                  size="small"
                  variant="contained"
                  disabled={busy}
                  onClick={() => approve(g, "ATHLETE")}
                  sx={{ fontWeight: 700 }}
                >
                  Atleta
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={busy}
                  onClick={() => approve(g, "PARENT")}
                  sx={{ fontWeight: 700 }}
                >
                  Genitore
                </Button>
              </Box>
            </Box>
          );
        })}
      </Box>
      <Typography variant="caption" color="text.disabled" sx={{ display: "block", mt: 1 }}>
        Per altri ruoli o per i dati atleta usa la scheda utente nella lista qui sotto.
      </Typography>
    </Paper>
  );
}
