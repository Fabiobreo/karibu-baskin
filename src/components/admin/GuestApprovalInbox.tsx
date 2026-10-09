"use client";
import { useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Menu,
  MenuItem,
  Paper,
  Typography,
} from "@mui/material";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { AppRole } from "@prisma/client";
import { assignableAppRoles, ROLE_LABELS_IT } from "@/lib/authRoles";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useToast } from "@/context/ToastContext";
import { readError } from "@/lib/fetchJson";
import { TYPE_SCALE } from "@/lib/typeScale";
import { RADIUS } from "@/lib/radius";
import { TOUCH_TARGET_ON_PHONE } from "@/lib/touchTarget";
import { FONT_WEIGHT } from "@/lib/fontWeight";

export interface GuestUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt: string | Date;
}

interface GuestApprovalInboxProps {
  /** Gli account ancora ospiti: la lista li ricava dalle sue righe. */
  guests: GuestUser[];
  /** L'admin assegna anche gli altri ruoli; l'allenatore solo Atleta o Genitore. */
  isAdmin?: boolean;
  /** Ruolo assegnato: la lista aggiorna la riga, e l'account esce da qui. */
  onApproved: (guestId: string, appRole: AppRole) => void;
}

/** I due ruoli con il bottone in riga: gli altri stanno nel menu "Altro". */
const QUICK_ROLES: AppRole[] = ["ATHLETE", "PARENT"];

/**
 * Corsia rapida di approvazione dei nuovi account (GUEST): un click per
 * promuovere ad Atleta o Genitore, senza passare dalla scheda completa.
 */
export default function GuestApprovalInbox({
  guests,
  isAdmin = false,
  onApproved,
}: GuestApprovalInboxProps) {
  const { showToast } = useToast();
  const [processing, setProcessing] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ anchor: HTMLElement; guest: GuestUser } | null>(null);

  if (guests.length === 0) return null;

  // Stessa regola dell'API (`canAssignAppRole`): niente voci che verrebbero rifiutate.
  const otherRoles = assignableAppRoles({
    actorRole: isAdmin ? "ADMIN" : "COACH",
    isSelf: false,
    current: "GUEST",
  }).filter((role) => role !== "GUEST" && !QUICK_ROLES.includes(role));

  async function approve(guest: GuestUser, appRole: AppRole) {
    setProcessing(guest.id);
    try {
      const res = await fetch(`/api/users/${guest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appRole }),
      });
      if (!res.ok) {
        const message = await readError(res);
        showToast({ message: message, severity: "error" });
        return;
      }
      onApproved(guest.id, appRole);
      showToast({
        message: `${guest.name ?? guest.email} approvato come ${ROLE_LABELS_IT[appRole]}`,
        severity: "success",
      });
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
      // Richiesta d'azione, non un avviso (UX-29): accento arancio sobrio come
      // la card "Allenamenti da completare" della dashboard.
      sx={{ p: 2.5, mb: 3, borderWidth: 2, borderColor: "primary.main" }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        <HowToRegIcon sx={{ color: "primary.onLight" }} />
        <Typography component="h2" variant="subtitle1">
          Nuovi account da approvare
        </Typography>
        <Chip label={guests.length} size="small" variant="outlined" />
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
                borderRadius: RADIUS.md,
                bgcolor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Avatar
                src={g.image ?? undefined}
                sx={{ width: 34, height: 34, fontSize: TYPE_SCALE.sm }}
              >
                {(g.name ?? g.email)[0]?.toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 140 }}>
                <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold} noWrap>
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
                  sx={TOUCH_TARGET_ON_PHONE}
                  onClick={() => approve(g, "ATHLETE")}
                >
                  Atleta
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={busy}
                  sx={TOUCH_TARGET_ON_PHONE}
                  onClick={() => approve(g, "PARENT")}
                >
                  Genitore
                </Button>
                {otherRoles.length > 0 && (
                  <Button
                    size="small"
                    variant="text"
                    disabled={busy}
                    sx={TOUCH_TARGET_ON_PHONE}
                    endIcon={<ExpandMoreIcon />}
                    aria-haspopup="menu"
                    aria-label={`Altro ruolo per ${g.name ?? g.email}`}
                    onClick={(e) => setMenu({ anchor: e.currentTarget, guest: g })}
                  >
                    Altro
                  </Button>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
      <Menu anchorEl={menu?.anchor} open={!!menu} onClose={() => setMenu(null)}>
        {otherRoles.map((role) => (
          <MenuItem
            key={role}
            onClick={() => {
              if (menu) approve(menu.guest, role);
              setMenu(null);
            }}
          >
            {ROLE_LABELS_IT[role]}
          </MenuItem>
        ))}
      </Menu>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
        {isAdmin
          ? "Per i dati atleta usa la scheda utente nella lista qui sotto."
          : "Per i dati atleta usa la scheda utente nella lista qui sotto. Gli altri ruoli li assegna un admin."}
      </Typography>
    </Paper>
  );
}
