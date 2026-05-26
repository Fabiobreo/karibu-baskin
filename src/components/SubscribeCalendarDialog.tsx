"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ResponsiveDialog from "@/components/ResponsiveDialog";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/Download";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useToast } from "@/context/ToastContext";

interface SubscribeCalendarDialogProps {
  open: boolean;
  onClose: () => void;
}

const ICS_PATH = "/api/calendar/export.ics";

export default function SubscribeCalendarDialog({ open, onClose }: SubscribeCalendarDialogProps) {
  const { showToast } = useToast();
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const httpsUrl = useMemo(() => (origin ? `${origin}${ICS_PATH}` : ICS_PATH), [origin]);
  const webcalUrl = useMemo(
    () => (origin ? `webcal://${origin.replace(/^https?:\/\//, "")}${ICS_PATH}` : ""),
    [origin]
  );
  const googleUrl = useMemo(
    () =>
      origin ? `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(httpsUrl)}` : "",
    [origin, httpsUrl]
  );

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(httpsUrl);
      showToast({ message: "URL copiato", severity: "success" });
    } catch {
      showToast({ message: "Impossibile copiare l'URL", severity: "error" });
    }
  }

  return (
    <ResponsiveDialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pr: 6, fontWeight: 800 }}>
        Iscriviti al calendario
        <IconButton
          onClick={onClose}
          sx={{ position: "absolute", right: 8, top: 8, color: "text.secondary" }}
          aria-label="Chiudi"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
          Aggiungi allenamenti, partite ed eventi al tuo calendario. Le modifiche e i nuovi eventi
          appariranno automaticamente (Google aggiorna ogni 8-24 ore, Apple più spesso).
        </Typography>

        <Stack spacing={2}>
          <Box>
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
              URL del calendario
            </Typography>
            <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
              <TextField
                value={httpsUrl}
                size="small"
                fullWidth
                InputProps={{ readOnly: true, sx: { fontFamily: "monospace", fontSize: 13 } }}
                onFocus={(e) => e.target.select()}
              />
              <Button
                onClick={handleCopy}
                variant="outlined"
                startIcon={<ContentCopyIcon />}
                sx={{ fontWeight: 600, flexShrink: 0 }}
              >
                Copia
              </Button>
            </Box>
          </Box>

          <Box>
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
              Scorciatoie
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 0.5 }}>
              <Button
                component="a"
                href={googleUrl || undefined}
                target="_blank"
                rel="noopener noreferrer"
                variant="contained"
                startIcon={<OpenInNewIcon />}
                disabled={!googleUrl}
                sx={{ fontWeight: 600 }}
              >
                Google Calendar
              </Button>
              <Button
                component="a"
                href={webcalUrl || undefined}
                variant="outlined"
                startIcon={<OpenInNewIcon />}
                disabled={!webcalUrl}
                sx={{ fontWeight: 600 }}
              >
                Apple / iCloud
              </Button>
              <Button
                component="a"
                href={ICS_PATH}
                download="karibu-baskin.ics"
                variant="text"
                startIcon={<DownloadIcon />}
                sx={{ fontWeight: 600 }}
              >
                Scarica .ics
              </Button>
            </Stack>
          </Box>

          <Box
            sx={{
              bgcolor: "action.hover",
              borderRadius: 1,
              p: 1.5,
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: "text.secondary", fontWeight: 700, display: "block", mb: 0.5 }}
            >
              Istruzioni Google Calendar
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
              1. Clicca su &quot;Google Calendar&quot; qui sopra (o da computer: Altri calendari →
              Aggiungi → Da URL).
              <br />
              2. Incolla l&apos;URL del calendario e conferma.
              <br />
              3. Gli eventi appaiono dopo qualche minuto. Gli aggiornamenti arrivano entro 24 ore.
            </Typography>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ fontWeight: 600 }}>
          Chiudi
        </Button>
      </DialogActions>
    </ResponsiveDialog>
  );
}
