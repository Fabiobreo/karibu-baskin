"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Link as MuiLink } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import SessionEditDialog, { type EditableSession } from "@/components/admin/SessionEditDialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useToast } from "@/context/ToastContext";
import { readError } from "@/lib/fetchJson";
import { FONT_WEIGHT } from "@/lib/fontWeight";

interface SessionActionsProps {
  session: EditableSession & { dateSlug: string | null };
  /** Apre subito la modifica (link `?modifica=<id>` dal calendario). */
  initialEdit?: boolean;
}

/**
 * Azioni su un allenamento, uguali nelle tre sezioni di /admin/allenamenti
 * (UX-14): modifica, elimina, apri la pagina pubblica.
 */
export default function SessionActions({ session, initialEdit = false }: SessionActionsProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { openConfirm, ConfirmDialog } = useConfirmDialog();
  const [editing, setEditing] = useState(initialEdit);

  async function remove() {
    const res = await fetch(`/api/sessions/${session.id}`, { method: "DELETE" });
    if (!res.ok) {
      showToast({ message: await readError(res), severity: "error" });
      return;
    }
    showToast({ message: `"${session.title}" eliminato`, severity: "success" });
    router.refresh();
  }

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 2 }}>
      <Button
        variant="outlined"
        startIcon={<EditIcon />}
        onClick={() => setEditing(true)}
        sx={{ minHeight: 44 }}
      >
        Modifica
      </Button>
      <Button
        color="error"
        startIcon={<DeleteOutlineIcon />}
        onClick={() =>
          openConfirm(
            "Eliminare l'allenamento?",
            `"${session.title}" verrà eliminato insieme a iscrizioni e risultati. L'azione è irreversibile.`,
            remove,
            { confirmLabel: "Elimina", confirmColor: "error" }
          )
        }
        sx={{ minHeight: 44 }}
      >
        Elimina
      </Button>
      <MuiLink
        href={`/allenamento/${session.dateSlug ?? session.id}`}
        variant="body2"
        sx={{
          ml: "auto",
          display: "inline-flex",
          alignItems: "center",
          gap: 0.5,
          minHeight: 44,
          fontWeight: FONT_WEIGHT.semibold,
        }}
      >
        Pagina dell&apos;allenamento
        <OpenInNewIcon fontSize="small" />
      </MuiLink>
      <SessionEditDialog
        session={editing ? session : null}
        onClose={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          router.refresh();
        }}
      />
      {ConfirmDialog}
    </Box>
  );
}
