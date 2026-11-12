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
import { alpha } from "@mui/material/styles";
import { socialBrandColor } from "@/lib/heroStyles";
import { RADIUS } from "@/lib/radius";
import { shareMessage, shareUrl, type ShareCampaign } from "@/lib/shareLinks";

type ShareKind = "training" | "event" | "match" | "news" | "album" | "quiz";

/** Campagna UTM di ogni tipo di pagina (UX-56). */
const CAMPAIGN: Record<ShareKind, ShareCampaign> = {
  training: "allenamento",
  event: "evento",
  match: "partita",
  news: "news",
  album: "album",
  quiz: "quiz",
};

/** Frase prima del link nel messaggio di WhatsApp. */
const WA_KEY = {
  training: "waTraining",
  event: "waEvent",
  match: "waMatch",
  news: "waNews",
  album: "waAlbum",
  quiz: "waQuiz",
} as const satisfies Record<ShareKind, string>;

/** Indicazione sotto il QR. */
const QR_HINT_KEY = {
  training: "qrHint",
  event: "qrHintEvent",
  match: "qrHintPage",
  news: "qrHintPage",
  album: "qrHintPage",
  quiz: "qrHintPage",
} as const satisfies Record<ShareKind, string>;

interface Props {
  title: string;
  /** Percorso della pagina (`/eventi/festa`): i link li costruisce il componente, con l'UTM di ogni bottone. */
  path: string;
  /** Cosa si condivide: testo di WhatsApp, campagna UTM e indicazione sotto il QR. */
  kind?: ShareKind;
  /** Album "Solo tesserati": il messaggio dice che serve l'accesso. */
  membersOnly?: boolean;
  /** Frase del messaggio al posto di quella del tipo (la sfida del quiz dice il punteggio). */
  message?: string;
  dark?: boolean; // stile per sfondi scuri
}

/** Bottone fantasma degli hero: stessa misura del "Gestisci" dello staff. */
const HERO_BUTTON_SX = { color: "common.white", typography: "caption", px: 1.5 } as const;

export default function ShareSection({
  title,
  path,
  kind = "training",
  membersOnly = false,
  message,
  dark = false,
}: Props) {
  const [qrOpen, setQrOpen] = useState(false);
  const { showToast } = useToast();
  const t = useTranslations("share");
  const tCommon = useTranslations("common");

  // Un link per bottone (UX-56): stessa pagina, provenienza diversa.
  const campaign = CAMPAIGN[kind];
  const waKey = kind === "album" && membersOnly ? "waAlbumMembers" : WA_KEY[kind];
  const waText = shareMessage(message ?? t(waKey, { title }), shareUrl(path, campaign, "whatsapp"));
  const waUrl = `https://wa.me/?text=${encodeURIComponent(waText)}`;
  const qrUrl = shareUrl(path, campaign, "qr");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl(path, campaign, "link"));
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
          // Sugli hero scuri e' il bottone fantasma del tema (bordo e fondo
          // seguono il testo bianco).
          color={dark ? "inherit" : undefined}
          sx={
            dark
              ? HERO_BUTTON_SX
              : {
                  // Il verde del marchio sul testo non arriva a 4,5:1 su fondo
                  // chiaro (UX-58, axe): testo neutro, verde sull'icona e sul
                  // bordo al passaggio. Il nome "WhatsApp" resta il segnale.
                  borderColor: "divider",
                  color: "text.primary",
                  "& .MuiButton-startIcon": { color: socialBrandColor.whatsapp },
                  "&:hover": {
                    borderColor: socialBrandColor.whatsapp,
                    backgroundColor: alpha(socialBrandColor.whatsapp, 0.06),
                  },
                }
          }
        >
          {t("whatsapp")}
        </Button>

        {dark ? (
          // Sugli hero scuri tre bottoni fantasma con etichetta, uguali fra
          // loro e al "Gestisci" dello staff (UX-32): le icone nude accanto a
          // un bottone con testo sembravano una riga lasciata a meta'.
          <>
            <Button
              variant="outlined"
              size="small"
              color="inherit"
              onClick={handleCopy}
              startIcon={<ContentCopyIcon />}
              sx={HERO_BUTTON_SX}
            >
              {t("copyLink")}
            </Button>
            <Button
              variant="outlined"
              size="small"
              color="inherit"
              onClick={() => setQrOpen(true)}
              startIcon={<QrCode2Icon />}
              aria-label={t("showQr")}
              sx={HERO_BUTTON_SX}
            >
              {t("qrShort")}
            </Button>
          </>
        ) : (
          <>
            <Tooltip title={t("copyLink")}>
              <IconButton size="small" onClick={handleCopy} aria-label={t("copyLink")}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t("showQr")}>
              <IconButton size="small" onClick={() => setQrOpen(true)} aria-label={t("showQr")}>
                <QrCode2Icon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Box>

      <Dialog open={qrOpen} onClose={() => setQrOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pr: 6 }}>
          QR Code: {title}
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
              borderRadius: RADIUS.lg,
              backgroundColor: "common.white",
              boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
              mb: 2,
            }}
          >
            <QRCodeSVG value={qrUrl} size={200} />
          </Box>
          <Typography variant="body2" color="text.secondary">
            {t(QR_HINT_KEY[kind])}
          </Typography>
        </DialogContent>
      </Dialog>
    </>
  );
}
