"use client";
import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CloseIcon from "@mui/icons-material/Close";
import { QRCodeSVG } from "qrcode.react";
import { useTranslations } from "next-intl";
import { useToast } from "@/context/ToastContext";

interface Props {
  sessionTitle: string;
  sessionUrl: string;
  dark?: boolean; // stile per sfondi scuri
}

export default function ShareSection({ sessionTitle, sessionUrl, dark = false }: Props) {
  const [qrOpen, setQrOpen] = useState(false);
  const { showToast } = useToast();
  const t = useTranslations("share");
  const tCommon = useTranslations("common");

  const waText = `Iscriviti all'allenamento "${sessionTitle}" di Karibu Baskin 🦊\n${sessionUrl}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(waText)}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(sessionUrl);
      showToast({ message: t("linkCopied"), severity: "success", duration: 2000 });
    } catch {
      showToast({ message: t("linkCopyFailed"), severity: "error" });
    }
  }

  return (
    <>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<WhatsAppIcon />}
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          sx={
            dark
              ? {
                  borderColor: "rgba(255,255,255,0.5)",
                  color: "#fff",
                  "&:hover": { borderColor: "#fff", backgroundColor: "rgba(255,255,255,0.08)" },
                }
              : {
                  borderColor: "#25D366",
                  color: "#25D366",
                  "&:hover": {
                    borderColor: "#128C7E",
                    color: "#128C7E",
                    backgroundColor: "rgba(37,211,102,0.06)",
                  },
                }
          }
        >
          {t("whatsapp")}
        </Button>

        <Tooltip title={t("copyLink")}>
          <IconButton
            size="small"
            onClick={handleCopy}
            aria-label={t("copyLink")}
            sx={dark ? { color: "rgba(255,255,255,0.7)", "&:hover": { color: "#fff" } } : {}}
          >
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title={t("showQr")}>
          <IconButton
            size="small"
            onClick={() => setQrOpen(true)}
            aria-label={t("showQr")}
            sx={dark ? { color: "rgba(255,255,255,0.7)", "&:hover": { color: "#fff" } } : {}}
          >
            <QrCode2Icon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Dialog open={qrOpen} onClose={() => setQrOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pr: 6 }}>
          QR Code — {sessionTitle}
          <IconButton
            onClick={() => setQrOpen(false)}
            aria-label={tCommon("close")}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ textAlign: "center", pb: 4 }}>
          <Box
            sx={{
              display: "inline-flex",
              p: 2,
              borderRadius: 2,
              backgroundColor: "#fff",
              boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
              mb: 2,
            }}
          >
            <QRCodeSVG value={sessionUrl} size={200} />
          </Box>
          <Typography variant="body2" color="text.secondary">
            {t("qrHint")}
          </Typography>
        </DialogContent>
      </Dialog>
    </>
  );
}
