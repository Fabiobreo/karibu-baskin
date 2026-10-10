"use client";

import { useState } from "react";
import { Box, ButtonBase, Dialog, IconButton } from "@mui/material";
import { alpha } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import { useTranslations } from "next-intl";
import { heroText } from "@/lib/heroStyles";

interface OpponentCrestProps {
  imageUrl: string;
  /** Nome della squadra, per le etichette. */
  name: string;
  /** `lg` per le nostre squadre: lo stemma è il segno della pagina. */
  size?: "md" | "lg";
  /** Anello nella tinta della squadra (hex da `teamColor()`); senza, neutro. */
  ringColor?: string | null;
}

/**
 * Stemma di una squadra nell'entity hero (avversarie e squadre nostre):
 * l'immagine intera in un cerchio bianco (i loghi sono quasi sempre disegnati
 * per un fondo chiaro). È un bottone: al tocco l'immagine si apre grande,
 * perché nel cerchio un logo ricco o una foto di squadra perdono i dettagli.
 *
 * Mai come sfondo della fascia: è larga otto volte la sua altezza, e di un
 * logo quadrato resterebbe una striscia.
 */
export default function OpponentCrest({
  imageUrl,
  name,
  size = "md",
  ringColor = null,
}: OpponentCrestProps) {
  const side = size === "lg" ? { xs: 80, sm: 120 } : { xs: 72, sm: 96 };
  const [open, setOpen] = useState(false);
  const t = useTranslations("teams");
  const tCommon = useTranslations("common");

  return (
    <>
      <ButtonBase
        onClick={() => setOpen(true)}
        aria-label={t("zoomLogo", { name })}
        sx={{
          width: side,
          height: side,
          flexShrink: 0,
          borderRadius: "50%",
          overflow: "hidden",
          bgcolor: "common.white",
          border: ringColor ? "3px solid" : "2px solid",
          borderColor: ringColor ?? heroText.lineStrong,
          transition: "border-color 0.15s",
          "&:hover, &.Mui-focusVisible": { borderColor: "primary.main" },
        }}
      >
        <Box
          component="img"
          src={imageUrl}
          alt=""
          sx={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
        />
      </ButtonBase>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="md"
        aria-label={name}
        PaperProps={{ sx: { bgcolor: "common.white", backgroundImage: "none" } }}
      >
        <Box sx={{ position: "relative" }}>
          <IconButton
            onClick={() => setOpen(false)}
            aria-label={tCommon("close")}
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              color: "common.white",
              bgcolor: (theme) => alpha(theme.palette.common.black, 0.55),
              "&:hover": { bgcolor: (theme) => alpha(theme.palette.common.black, 0.75) },
            }}
          >
            <CloseIcon />
          </IconButton>
          <Box
            component="img"
            src={imageUrl}
            alt={name}
            sx={{ display: "block", maxWidth: "100%", maxHeight: "80vh", objectFit: "contain" }}
          />
        </Box>
      </Dialog>
    </>
  );
}
