"use client";
import { useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Divider,
  IconButton,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import LockIcon from "@mui/icons-material/Lock";
import ReplyIcon from "@mui/icons-material/Reply";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useToast } from "@/context/ToastContext";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { readError } from "@/lib/fetchJson";
import { errorText } from "@/lib/networkError";
import { TYPE_SCALE } from "@/lib/typeScale";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { TOUCH_TARGET_ON_PHONE } from "@/lib/touchTarget";
import type { AdminSuggestion, AdminSuggestionNote } from "@/lib/suggestions/adminSuggestion";

export function formatSuggestionDate(iso: string): string {
  return format(new Date(iso), "d MMM yyyy, HH:mm", { locale: it });
}

type Kind = "NOTE" | "REPLY";

interface SuggestionThreadProps {
  suggestion: AdminSuggestion;
  currentUserId: string;
  isAdmin: boolean;
  /** Nota salvata: la card aggiorna lista, stato e ultima attività. */
  onNoteAdded: (suggestionId: string, note: AdminSuggestionNote, status: string) => void;
  onNoteDeleted: (suggestionId: string, noteId: string) => void;
}

/** Note e risposte di un suggerimento, più il modulo per scriverne una. La bozza sta qui. */
export default function SuggestionThread({
  suggestion,
  currentUserId,
  isAdmin,
  onNoteAdded,
  onNoteDeleted,
}: SuggestionThreadProps) {
  const { showToast } = useToast();
  const { openConfirm, ConfirmDialog } = useConfirmDialog();
  const [kind, setKind] = useState<Kind>("NOTE");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const isReply = kind === "REPLY";

  async function send() {
    const body = draft.trim();
    if (!body) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/suggestions/${suggestion.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, kind }),
      });
      if (!res.ok) throw new Error(await readError(res));
      const data: { note: AdminSuggestionNote; status: string } = await res.json();
      onNoteAdded(suggestion.id, data.note, data.status);
      setDraft("");
      setKind("NOTE");
      showToast({ message: isReply ? "Risposta inviata" : "Nota salvata", severity: "success" });
    } catch (err) {
      showToast({ message: errorText(err, "Errore"), severity: "error" });
    } finally {
      setBusy(false);
    }
  }

  function submit() {
    if (!isReply) {
      void send();
      return;
    }
    openConfirm(
      "Inviare la risposta?",
      "Chi ha scritto il suggerimento la riceve subito come notifica.",
      () => void send(),
      { confirmLabel: "Invia", confirmColor: "primary" }
    );
  }

  function askDeleteNote(note: AdminSuggestionNote) {
    const reply = note.isReply;
    openConfirm(
      reply ? "Eliminare la risposta?" : "Eliminare la nota?",
      reply
        ? "Chi ha scritto il suggerimento non la vedrà più. La notifica che ha già ricevuto resta."
        : "L'azione non può essere annullata.",
      async () => {
        try {
          const res = await fetch(`/api/suggestions/${suggestion.id}/notes/${note.id}`, {
            method: "DELETE",
          });
          if (!res.ok && res.status !== 204) throw new Error(await readError(res));
          onNoteDeleted(suggestion.id, note.id);
        } catch (err) {
          showToast({ message: errorText(err, "Errore"), severity: "error" });
        }
      }
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: 1.5 }}>
      <Divider />
      {suggestion.notes.map((n) => {
        const canDelete = isAdmin || n.author.id === currentUserId;
        const Icon = n.isReply ? ReplyIcon : LockIcon;
        return (
          <Box key={n.id} sx={{ display: "flex", gap: 1.25 }}>
            <Avatar
              src={n.author.customImage ?? n.author.image ?? undefined}
              sx={{ width: 32, height: 32, typography: "caption" }}
            >
              {n.author.name?.[0]?.toUpperCase() ?? "?"}
            </Avatar>
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                borderRadius: RADIUS.md,
                p: 1.25,
                ...(n.isReply
                  ? { border: "1px solid", borderColor: "divider" }
                  : { bgcolor: "action.hover" }),
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  color: "text.secondary",
                  mb: 0.5,
                }}
              >
                <Icon fontSize="inherit" />
                <Typography
                  variant="caption"
                  sx={{ color: "text.secondary", fontWeight: FONT_WEIGHT.semibold }}
                >
                  {n.isReply ? "Risposta all'autore" : "Nota interna"}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Typography variant="caption" sx={{ fontWeight: FONT_WEIGHT.semibold }}>
                  {n.author.name ?? "Staff"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatSuggestionDate(n.createdAt)}
                </Typography>
                {canDelete && (
                  <Tooltip title="Elimina nota">
                    <IconButton
                      size="small"
                      aria-label="Elimina nota"
                      sx={{ ml: "auto", ...TOUCH_TARGET_ON_PHONE }}
                      onClick={() => askDeleteNote(n)}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", mt: 0.25 }}>
                {n.body}
              </Typography>
            </Box>
          </Box>
        );
      })}

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={kind}
          onChange={(_, v: Kind | null) => v && setKind(v)}
          aria-label="Tipo di messaggio"
          sx={{ alignSelf: "flex-start" }}
        >
          <ToggleButton value="NOTE" sx={TOUCH_TARGET_ON_PHONE}>
            Nota interna
          </ToggleButton>
          <ToggleButton value="REPLY" disabled={!suggestion.canReply} sx={TOUCH_TARGET_ON_PHONE}>
            Risposta all&apos;autore
          </ToggleButton>
        </ToggleButtonGroup>
        {!suggestion.canReply && (
          <Typography variant="caption" color="text.secondary">
            Chi l&apos;ha scritto non ha più un account: puoi solo lasciare una nota interna.
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary">
          {isReply
            ? "Arriva a chi ha scritto il suggerimento, con una notifica. Non saprà chi sei, e tu non sai chi è."
            : "La leggono solo allenatori e admin."}
        </Typography>
        <TextField
          label={isReply ? "Risposta" : "Nota"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          size="small"
          fullWidth
          multiline
          minRows={2}
          maxRows={6}
          slotProps={{ htmlInput: { maxLength: 1000 } }}
        />
        <Button
          variant="outlined"
          disabled={busy || !draft.trim()}
          onClick={submit}
          sx={{ alignSelf: "flex-end", ...TOUCH_TARGET_ON_PHONE }}
        >
          {isReply ? "Invia risposta" : "Salva nota"}
        </Button>
      </Box>
      {ConfirmDialog}
    </Box>
  );
}
