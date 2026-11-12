import type React from "react";
import { Box, Typography } from "@mui/material";

interface MatchSectionTitleProps {
  id: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  /** Azioni a destra sulla stessa riga (staff). */
  action?: React.ReactNode;
}

/**
 * Titolo di una sezione della pagina partita (UX-58): h2 con l'icona arancio
 * delle sezioni chiare (UX-28), uguale per tutte le sezioni del dopo-partita.
 * Niente "use client": si usa sia nei Server sia nei Client Component.
 */
export default function MatchSectionTitle({ id, icon, children, action }: MatchSectionTitleProps) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1,
        flexWrap: "wrap",
        mb: 2,
      }}
    >
      <Typography
        id={id}
        component="h2"
        variant="h6"
        sx={{ display: "flex", alignItems: "center", gap: 1 }}
      >
        <Box
          component="span"
          aria-hidden="true"
          sx={{ display: "inline-flex", color: "primary.main", "& svg": { width: 20, height: 20 } }}
        >
          {icon}
        </Box>
        {children}
      </Typography>
      {action}
    </Box>
  );
}
