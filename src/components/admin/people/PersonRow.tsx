"use client";
import type { ReactNode } from "react";
import { Avatar, Box, Typography } from "@mui/material";
import { roleColorSx } from "@/lib/constants";
import { TYPE_SCALE } from "@/lib/typeScale";
import { FONT_WEIGHT } from "@/lib/fontWeight";

interface PersonRowProps {
  name: string;
  image?: string | null;
  sportRole: number | null;
  /** Seconda riga: email, "figlio di …", stato presenza. */
  meta?: ReactNode;
  /** Azione a destra (pulsante, stato). */
  trailing?: ReactNode;
  /** Contenuto sotto la riga, a tutta larghezza (es. scelta del ruolo). */
  children?: ReactNode;
  dimmed?: boolean;
}

/**
 * Riga persona per le liste dello staff: avatar col numero del ruolo, nome,
 * una riga di dettaglio e un'azione. Alta almeno 56px, per il pollice.
 */
export default function PersonRow({
  name,
  image,
  sportRole,
  meta,
  trailing,
  children,
  dimmed,
}: PersonRowProps) {
  return (
    <Box sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          minHeight: 56,
          py: 0.75,
          opacity: dimmed ? 0.55 : 1,
        }}
      >
        <Avatar
          src={image ?? undefined}
          sx={{
            width: 36,
            height: 36,
            fontSize: TYPE_SCALE.sm,
            fontWeight: FONT_WEIGHT.bold,
            // Ruolo Baskin nel suo colore (UX-29); senza ruolo, neutro tenue.
            ...(sportRole
              ? roleColorSx(sportRole)
              : { bgcolor: "action.selected", color: "text.secondary" }),
          }}
        >
          {sportRole ?? name[0]?.toUpperCase()}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            fontWeight={FONT_WEIGHT.semibold}
            sx={{ overflowWrap: "anywhere" }}
          >
            {name}
          </Typography>
          {meta && (
            <Typography
              variant="caption"
              color="text.secondary"
              component="div"
              sx={{ overflowWrap: "anywhere" }}
            >
              {meta}
            </Typography>
          )}
        </Box>
        {trailing && <Box sx={{ flexShrink: 0 }}>{trailing}</Box>}
      </Box>
      {children}
    </Box>
  );
}
