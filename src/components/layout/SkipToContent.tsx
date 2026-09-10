"use client";
import Box from "@mui/material/Box";
import { useTranslations } from "next-intl";

/**
 * Primo elemento focusabile del body: invisibile finche non riceve il focus,
 * poi compare in alto a sinistra e porta direttamente a <main id="contenuto">.
 */
export default function SkipToContent() {
  const t = useTranslations("nav");

  return (
    <Box
      component="a"
      href="#contenuto"
      sx={{
        // Tecnica visually-hidden standard: l'elemento resta nel flusso e nella
        // sequenza di Tab (spostarlo a left:-9999px lo fa saltare da Chrome),
        // ma occupa 1px ritagliato finche non riceve il focus.
        position: "absolute",
        left: 8,
        top: 8,
        // "1px", non 1: nel sistema di sizing di MUI un valore <= 1 e' una
        // percentuale, quindi `width: 1` diventava 100% e il link ritagliato
        // sporgeva di 8px a destra, dando scroll orizzontale a ogni pagina.
        width: "1px",
        height: "1px",
        overflow: "hidden",
        clipPath: "inset(50%)",
        whiteSpace: "nowrap",
        zIndex: (theme) => theme.zIndex.tooltip + 1,
        px: 0,
        py: 0,
        borderRadius: 1,
        bgcolor: "primary.main",
        color: "primary.contrastText",
        fontWeight: 700,
        fontSize: "0.9rem",
        textDecoration: "none",
        "&:focus": {
          width: "auto",
          height: "auto",
          overflow: "visible",
          clipPath: "none",
          px: 2,
          py: 1,
        },
      }}
    >
      {t("skipToContent")}
    </Box>
  );
}
