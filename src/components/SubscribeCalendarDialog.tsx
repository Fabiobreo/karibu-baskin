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
import { useTranslations } from "next-intl";
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
  const t = useTranslations("calendarSub");
  const tCommon = useTranslations("common");
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
      showToast({ message: t("urlCopied"), severity: "success" });
    } catch {
      showToast({ message: t("urlCopyFailed"), severity: "error" });
    }
  }

  return (
    <ResponsiveDialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pr: 6, fontWeight: 800 }}>
        {t("title")}
        <IconButton
          onClick={onClose}
          sx={{ position: "absolute", right: 8, top: 8, color: "text.secondary" }}
          aria-label={tCommon("close")}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
          {t("intro")}
        </Typography>

        <Stack spacing={2}>
          <Box>
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
              {t("urlLabel")}
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
                {tCommon("copy")}
              </Button>
            </Box>
          </Box>

          <Box>
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
              {t("shortcuts")}
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
                {t("downloadIcs")}
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
              {t("instructionsTitle")}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "text.secondary", display: "block", whiteSpace: "pre-line" }}
            >
              {t("instructionsBody")}
            </Typography>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ fontWeight: 600 }}>
          {tCommon("close")}
        </Button>
      </DialogActions>
    </ResponsiveDialog>
  );
}
