"use client";
import type { RefObject } from "react";
import { Box, Button, Chip, Collapse, Paper, Typography } from "@mui/material";
import StatusPill from "@/components/common/StatusPill";
import RowActions, { type RowAction } from "@/components/admin/RowActions";
import SuggestionThread, { formatSuggestionDate } from "@/components/admin/SuggestionThread";
import { RADIUS } from "@/lib/radius";
import { TOUCH_TARGET_ON_PHONE } from "@/lib/touchTarget";
import type { AdminSuggestion, AdminSuggestionNote } from "@/lib/suggestions/adminSuggestion";
import { SUGGESTION_CATEGORY_LABELS, excerpt } from "@/lib/suggestions/suggestionNotify";

type Status = AdminSuggestion["status"];

// Stato del suggerimento (UX-29): forma e parola, niente tinte. Nuovo = pieno
// (e' quello da guardare), Letto = contornato, Archiviato = tenue.
const STATUS_META: Record<Status, { label: string; variant: "inverted" | "outlined" | "muted" }> = {
  NUOVO: { label: "Nuovo", variant: "inverted" },
  LETTO: { label: "Letto", variant: "outlined" },
  ARCHIVIATO: { label: "Archiviato", variant: "muted" },
};

interface SuggestionCardProps {
  suggestion: AdminSuggestion;
  open: boolean;
  onToggle: () => void;
  currentUserId: string;
  isAdmin: boolean;
  onStatus: (id: string, status: Status) => void;
  /** `false` = non eliminato (errore già mostrato). */
  onDelete: (id: string) => Promise<boolean>;
  onNoteAdded: (suggestionId: string, note: AdminSuggestionNote, status: string) => void;
  onNoteDeleted: (suggestionId: string, noteId: string) => void;
  focusAfterDelete: RefObject<HTMLElement | null>;
}

export default function SuggestionCard({
  suggestion: s,
  open,
  onToggle,
  currentUserId,
  isAdmin,
  onStatus,
  onDelete,
  onNoteAdded,
  onNoteDeleted,
  focusAfterDelete,
}: SuggestionCardProps) {
  const threadId = `thread-${s.id}`;
  const n = s.notes.length;
  const items: RowAction[] =
    s.status === "NUOVO"
      ? [{ label: "Segna come letto", onClick: () => onStatus(s.id, "LETTO") }]
      : [];

  return (
    <Paper
      id={`s-${s.id}`}
      variant="outlined"
      sx={{ p: 2.5, borderRadius: RADIUS.lg, scrollMarginTop: 80 }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <StatusPill label={STATUS_META[s.status].label} variant={STATUS_META[s.status].variant} />
          <Chip label={SUGGESTION_CATEGORY_LABELS[s.category]} size="small" variant="outlined" />
          <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
            {formatSuggestionDate(s.createdAt)}
          </Typography>
        </Box>

        <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
          {s.message}
        </Typography>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Button
            variant="text"
            size="small"
            onClick={onToggle}
            aria-expanded={open}
            aria-controls={threadId}
            sx={TOUCH_TARGET_ON_PHONE}
          >
            {open ? "Chiudi" : n > 0 ? `Note e risposte (${n})` : "Rispondi o aggiungi una nota"}
          </Button>
          <RowActions
            subject={excerpt(s.message, 40)}
            primary={
              s.status === "ARCHIVIATO"
                ? { label: "Riapri", onClick: () => onStatus(s.id, "LETTO") }
                : { label: "Archivia", onClick: () => onStatus(s.id, "ARCHIVIATO") }
            }
            items={items}
            onDelete={() => onDelete(s.id)}
            deleteLabel="Elimina suggerimento…"
            deleteConfirm={{
              title: "Eliminare il suggerimento?",
              message:
                "Si cancellano anche tutte le note e le risposte. Chi l'ha scritto non vedrà più le risposte.",
            }}
            focusAfterDelete={focusAfterDelete}
          />
        </Box>

        {/* Montato anche da chiuso: la bozza non si perde. */}
        <Collapse in={open} id={threadId}>
          <SuggestionThread
            suggestion={s}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            onNoteAdded={onNoteAdded}
            onNoteDeleted={onNoteDeleted}
          />
        </Collapse>
      </Box>
    </Paper>
  );
}
