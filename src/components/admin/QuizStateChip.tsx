"use client";
import { Box, Chip } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import EditNoteIcon from "@mui/icons-material/EditNote";
import GroupIcon from "@mui/icons-material/Group";
import PublicIcon from "@mui/icons-material/Public";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import type { GameVisibility, QuizQuestionStatus } from "@prisma/client";
import { GAME_VISIBILITY_LABELS } from "@/lib/games/gameSettings";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { RADIUS } from "@/lib/radius";
import { TYPE_SCALE } from "@/lib/typeScale";

/**
 * Stato di un quiz o di una domanda nel pannello (UX-71). Neutri per la
 * palette (uno stato non è una valenza): "fatto" è il chip pieno nel nero del
 * marchio (neutro invertito), "da fare" è contornato tratteggiato. Sempre con
 * icona e parola.
 */
function StateChip({ on, icon, label }: { on: boolean; icon: React.ReactNode; label: string }) {
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

/** Chi vede il quiz: acceso (per tutti o tesserati) o spento. */
export default function QuizStateChip({ visibility }: { visibility: GameVisibility }) {
  const icon =
    visibility === "PUBLIC" ? (
      <PublicIcon aria-hidden />
    ) : visibility === "MEMBERS" ? (
      <GroupIcon aria-hidden />
    ) : (
      <PowerSettingsNewIcon aria-hidden />
    );
  return (
    <StateChip on={visibility !== "OFF"} icon={icon} label={GAME_VISIBILITY_LABELS[visibility]} />
  );
}

/** Domanda approvata (entra nel gioco) o in prova. */
export function QuestionStateChip({ status }: { status: QuizQuestionStatus }) {
  return status === "APPROVED" ? (
    <StateChip on icon={<CheckIcon aria-hidden />} label="Approvata" />
  ) : (
    <StateChip on={false} icon={<EditNoteIcon aria-hidden />} label="In prova" />
  );
}
