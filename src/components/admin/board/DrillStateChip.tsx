"use client";
import { Box, Chip } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import EditNoteIcon from "@mui/icons-material/EditNote";
import Inventory2Icon from "@mui/icons-material/Inventory2Outlined";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { RADIUS } from "@/lib/radius";
import { TYPE_SCALE } from "@/lib/typeScale";

/**
 * Stato di uno schema della lavagna (UX-72), come gli stati dei quiz (UX-71):
 * neutri, pubblicato pieno nel nero del marchio, bozza e archiviato
 * contornati tratteggiati. Sempre icona e parola.
 */
export default function DrillStateChip({
  status,
  archived,
}: {
  status: "DRAFT" | "PUBLISHED";
  archived: boolean;
}) {
  const on = !archived && status === "PUBLISHED";
  const [icon, label] = archived
    ? [<Inventory2Icon key="i" aria-hidden />, "Archiviato"]
    : on
      ? [<CheckIcon key="i" aria-hidden />, "Pubblicato"]
      : [<EditNoteIcon key="i" aria-hidden />, "Bozza"];
  return (
    <Chip
      size="small"
      label={
        <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
          {icon}
          {label}
        </Box>
      }
      sx={{
        flexShrink: 0,
        borderRadius: RADIUS.sm,
        fontWeight: FONT_WEIGHT.semibold,
        "& svg": { fontSize: TYPE_SCALE.md },
        ...(on
          ? { bgcolor: "secondary.main", color: "secondary.contrastText" }
          : {
              bgcolor: "transparent",
              color: "text.secondary",
              border: "1px dashed",
              borderColor: "text.secondary",
            }),
      }}
    />
  );
}
