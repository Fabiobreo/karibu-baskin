"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, Paper, Avatar, Button, Stack, Chip, CircularProgress,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import FamilyRestroomIcon from "@mui/icons-material/FamilyRestroom";
import { useToast } from "@/context/ToastContext";
import { GENDER_LABELS, sportRoleLabel, ROLE_COLORS } from "@/lib/constants";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { Gender } from "@prisma/client";

interface LinkRequest {
  id: string;
  child: {
    id: string;
    name: string;
    sportRole: number | null;
    sportRoleVariant: string | null;
    gender: Gender | null;
    birthDate: string | null;
  };
  parent: {
    id: string;
    name: string | null;
    image: string | null;
    email: string;
  };
  createdAt: string;
}

function formatBirthDate(d: string | null): string {
  if (!d) return "";
  try { return format(new Date(d), "d MMMM yyyy", { locale: it }); } catch { return ""; }
}

export default function LinkRequestsSection() {
  const [requests, setRequests] = useState<LinkRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);
  const { showToast } = useToast();

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/link-requests");
      if (res.ok) setRequests(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  async function respond(requestId: string, accept: boolean) {
    setResponding(requestId);
    try {
      const res = await fetch(`/api/link-requests/${requestId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accept }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast({ message: data.error ?? "Errore nella risposta", severity: "error" });
        return;
      }
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      showToast({
        message: accept ? "Collegamento accettato!" : "Richiesta rifiutata",
        severity: accept ? "success" : "info",
      });
    } catch {
      showToast({ message: "Errore di rete", severity: "error" });
    } finally {
      setResponding(null);
    }
  }

  if (loading) return <CircularProgress size={24} />;
  if (requests.length === 0) return null;

  return (
    <Paper id="richieste" elevation={0} variant="outlined" sx={{ p: 3, mb: 3, borderColor: "warning.main" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <FamilyRestroomIcon color="warning" fontSize="small" />
        <Typography variant="subtitle1" fontWeight={700}>
          Richieste di collegamento
        </Typography>
        <Chip label={requests.length} size="small" color="warning" sx={{ fontWeight: 700 }} />
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Un genitore ha richiesto di collegare il proprio account al tuo profilo.
      </Typography>
      <Stack spacing={2}>
        {requests.map((req) => (
          <Paper key={req.id} variant="outlined" sx={{ p: 2 }}>
            <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
              <Avatar
                src={req.parent.image ?? undefined}
                sx={{ width: 44, height: 44, flexShrink: 0, mt: 0.25 }}
              >
                {(req.parent.name ?? req.parent.email)[0].toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={700}>
                  {req.parent.name ?? req.parent.email}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {req.parent.email}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  Vuole collegarsi al profilo: <strong>{req.child.name}</strong>
                  {req.child.sportRole ? ` · ${sportRoleLabel(req.child.sportRole, req.child.sportRoleVariant)}` : ""}
                  {req.child.gender ? ` · ${GENDER_LABELS[req.child.gender]}` : ""}
                  {req.child.birthDate ? ` · nato/a il ${formatBirthDate(req.child.birthDate)}` : ""}
                </Typography>
                {req.child.sportRole && (
                  <Chip
                    label={sportRoleLabel(req.child.sportRole, req.child.sportRoleVariant)}
                    size="small"
                    sx={{
                      mt: 0.5,
                      bgcolor: ROLE_COLORS[req.child.sportRole],
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: "0.68rem",
                    }}
                  />
                )}
              </Box>
            </Box>
            <Box sx={{ display: "flex", gap: 1, mt: 1.5, justifyContent: "flex-end" }}>
              <Button
                size="small" color="error" variant="outlined"
                startIcon={responding === req.id ? <CircularProgress size={14} color="inherit" /> : <CloseIcon />}
                disabled={responding === req.id}
                onClick={() => respond(req.id, false)}
              >
                Rifiuta
              </Button>
              <Button
                size="small" color="success" variant="contained"
                startIcon={responding === req.id ? <CircularProgress size={14} color="inherit" /> : <CheckIcon />}
                disabled={responding === req.id}
                onClick={() => respond(req.id, true)}
              >
                Accetta
              </Button>
            </Box>
          </Paper>
        ))}
      </Stack>
    </Paper>
  );
}
