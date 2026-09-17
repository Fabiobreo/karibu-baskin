"use client";
import { useState } from "react";
import { Box, ButtonBase, Dialog, IconButton, Paper, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import { useTranslations } from "next-intl";

interface EventPosterProps {
  imageUrl: string;
  title: string;
}

/**
 * Locandina dell'evento. Spesso è un'immagine verticale piena di testo, quindi
 * non si ritaglia mai: su desktop sta intera nella colonna laterale, su mobile
 * è una riga compatta con miniatura. In entrambi i casi un clic la ingrandisce.
 */
export default function EventPoster({ imageUrl, title }: EventPosterProps) {
  const t = useTranslations("events");
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop: locandina intera */}
      <Box sx={{ display: { xs: "none", md: "block" } }}>
        <ButtonBase
          onClick={() => setOpen(true)}
          aria-label={t("posterOpen")}
          sx={{ display: "block", width: "100%", borderRadius: 2, cursor: "zoom-in" }}
        >
          <Box
            component="img"
            src={imageUrl}
            alt={title}
            sx={{
              display: "block",
              width: "100%",
              height: "auto",
              borderRadius: 2,
              border: 1,
              borderColor: "divider",
            }}
          />
        </ButtonBase>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5, mt: 1 }}
        >
          <ZoomInIcon sx={{ fontSize: 16 }} />
          {t("posterZoom")}
        </Typography>
      </Box>

      {/* Mobile: riga compatta */}
      <Paper
        variant="outlined"
        sx={{ display: { xs: "block", md: "none" }, borderRadius: 3, overflow: "hidden" }}
      >
        <ButtonBase
          onClick={() => setOpen(true)}
          aria-label={t("posterOpen")}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: 2,
            width: "100%",
            p: 1.5,
            textAlign: "left",
          }}
        >
          <Box
            component="img"
            src={imageUrl}
            alt=""
            sx={{
              width: 56,
              height: 80,
              objectFit: "cover",
              objectPosition: "top",
              borderRadius: 1,
              flexShrink: 0,
            }}
          />
          <Box>
            <Typography variant="body2" fontWeight={700}>
              {t("poster")}
            </Typography>
            <Typography variant="body2" fontWeight={600} sx={{ color: "primary.onLight" }}>
              {t("posterShow")}
            </Typography>
          </Box>
        </ButtonBase>
      </Paper>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth={false}
        PaperProps={{
          sx: { bgcolor: "common.black", backgroundImage: "none", m: 1, position: "relative" },
        }}
      >
        <IconButton
          onClick={() => setOpen(false)}
          aria-label={t("posterClose")}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            color: "common.white",
            bgcolor: (th) => alpha(th.palette.common.black, 0.55),
            "&:hover": { bgcolor: (th) => alpha(th.palette.common.black, 0.75) },
          }}
        >
          <CloseIcon />
        </IconButton>
        <Box
          component="img"
          src={imageUrl}
          alt={title}
          sx={{
            display: "block",
            maxWidth: "100%",
            maxHeight: "calc(100vh - 16px)",
            width: "auto",
            height: "auto",
          }}
        />
      </Dialog>
    </>
  );
}
