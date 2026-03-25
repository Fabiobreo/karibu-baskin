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
import { useToast } from "@/context/ToastContext";

interface Props {
  sessionTitle: string;
  sessionUrl: string;
}

export default function ShareSection({ sessionTitle, sessionUrl }: Props) {
  const [qrOpen, setQrOpen] = useState(false);
  const { showToast } = useToast();

  const waText = `Iscriviti all'allenamento "${sessionTitle}" di Karibu Baskin 🦊\n${sessionUrl}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(waText)}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(sessionUrl);
      showToast({ message: "Link copiato negli appunti!", severity: "success", duration: 2000 });
    } catch {
      showToast({ message: "Impossibile copiare il link", severity: "error" });
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
          sx={{
            borderColor: "#25D366",
            color: "#25D366",
            "&:hover": { borderColor: "#128C7E", color: "#128C7E", backgroundColor: "rgba(37,211,102,0.06)" },
          }}
        >
          Condividi su WhatsApp
        </Button>

        <Tooltip title="Copia link">
          <IconButton size="small" onClick={handleCopy}>
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Mostra QR Code">
          <IconButton size="small" onClick={() => setQrOpen(true)}>
            <QrCode2Icon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Dialog open={qrOpen} onClose={() => setQrOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pr: 6 }}>
          QR Code — {sessionTitle}
          <IconButton
            onClick={() => setQrOpen(false)}
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
            Inquadra il QR code per iscriverti all&apos;allenamento
          </Typography>
        </DialogContent>
      </Dialog>
    </>
  );
}
