"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Alert, Box, Button, Paper, Typography } from "@mui/material";
import PageHeader from "@/components/common/PageHeader";
import DrillPlayer from "@/components/board/DrillPlayer";
import SuggestionThread, { formatSuggestionDate } from "@/components/admin/SuggestionThread";
import { useToast } from "@/context/ToastContext";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { readError } from "@/lib/fetchJson";
import type { AdminProposal } from "@/lib/board/loadProposals";
import { DRILL_COURT_LABELS, DRILL_KIND_LABELS } from "@/lib/board/labels";
import { RADIUS } from "@/lib/radius";
import type { AdminSuggestion } from "@/lib/suggestions/adminSuggestion";

interface AdminProposalClientProps {
  proposal: AdminProposal;
  readOnly: boolean;
  currentUserId: string;
  isAdmin: boolean;
}

/**
 * Una proposta di esercizio di un tesserato nel pannello (UX-73): il visore,
 * chi l'ha proposta (le proposte sono firmate), il filo del suggerimento per
 * note interne e risposte, e i due esiti: "Adotta" (diventa una bozza dello
 * staff) e "Non adesso" (messa da parte, l'autore la puo' rileggere). Il
 * dirigente legge soltanto.
 */
export default function AdminProposalClient({
  proposal: p,
  readOnly,
  currentUserId,
  isAdmin,
}: AdminProposalClientProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { openConfirm, ConfirmDialog } = useConfirmDialog();
  const [suggestion, setSuggestion] = useState<AdminSuggestion | null>(p.suggestion);

  const act = useMutation({
    mutationFn: async (what: "adopt" | "decline") => {
      const res = await fetch(
        what === "adopt" ? `/api/drills/${p.id}/adopt` : `/api/drills/${p.id}`,
        { method: what === "adopt" ? "POST" : "DELETE" }
      );
      if (!res.ok) throw new Error(await readError(res));
      return what;
    },
    onSuccess: (what) => {
      if (what === "adopt") {
        showToast({ message: "Adottata: ora è una bozza dello staff", severity: "success" });
        router.push(`/admin/playbook/${p.id}`);
      } else {
        showToast({ message: "Messa da parte", severity: "success" });
        router.refresh();
      }
    },
    onError: (err) => showToast({ message: err.message, severity: "error" }),
  });

  const adopt = () =>
    openConfirm(
      `Adottare ${p.title}?`,
      "Diventa una bozza dello staff: la sistemi e la pubblichi quando vuoi. A chi l'ha proposta arriva una risposta: «Lo staff ha preso il tuo esercizio».",
      () => act.mutate("adopt"),
      { confirmLabel: "Adotta", confirmColor: "primary" }
    );
  const decline = () =>
    openConfirm(
      "Mettere da parte la proposta?",
      "Resta a chi l'ha proposta, che la può rileggere. Prima scrivigli due righe con «Risposta all'autore».",
      () => act.mutate("decline"),
      { confirmLabel: "Non adesso", confirmColor: "primary" }
    );

  return (
    <>
      <PageHeader
        title={p.title}
        breadcrumb={[
          { label: "Playbook", href: "/admin/playbook" },
          { label: "Proposte", href: "/admin/playbook?scheda=proposte" },
          { label: p.title },
        ]}
        subtitle={`Proposta di ${p.authorName ?? "un utente che non c'è più"} · ${DRILL_KIND_LABELS[p.kind]} · ${DRILL_COURT_LABELS[p.court]}`}
        action={
          readOnly ? undefined : (
            <Button variant="contained" onClick={adopt} disabled={act.isPending}>
              Adotta
            </Button>
          )
        }
      />

      {p.archived && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Messa da parte: chi l&apos;ha proposta la può ancora rileggere. Si può adottare lo stesso.
        </Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gap: 3,
          gridTemplateColumns: { lg: "minmax(0, 3fr) minmax(0, 2fr)" },
          alignItems: "start",
        }}
      >
        <Box>
          <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 1 }}>
            Inviata il {formatSuggestionDate(p.proposedAt)}
          </Typography>
          {p.description && (
            <Typography variant="body1" sx={{ mb: 2, whiteSpace: "pre-line" }}>
              {p.description}
            </Typography>
          )}
          <DrillPlayer title={p.title} court={p.court} content={p.content} />
          {!readOnly && !p.archived && (
            <Button
              variant="text"
              color="inherit"
              onClick={decline}
              disabled={act.isPending}
              sx={{ mt: 2 }}
            >
              Non adesso
            </Button>
          )}
        </Box>

        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: RADIUS.lg }}>
          <Typography variant="h6" component="h2">
            Note e risposte
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Le proposte di esercizi sono firmate: sai chi l&apos;ha fatta. Le note interne le
            leggono solo allenatori e admin.
          </Typography>
          {suggestion ? (
            <SuggestionThread
              suggestion={suggestion}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              signed
              readOnly={readOnly}
              onNoteAdded={(_, note, status) =>
                setSuggestion((s) =>
                  s
                    ? {
                        ...s,
                        status: status as AdminSuggestion["status"],
                        notes: [...s.notes, note],
                      }
                    : s
                )
              }
              onNoteDeleted={(_, noteId) =>
                setSuggestion((s) =>
                  s ? { ...s, notes: s.notes.filter((n) => n.id !== noteId) } : s
                )
              }
            />
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              Chi l&apos;ha proposta non ha più un account: non si può rispondere.
            </Typography>
          )}
        </Paper>
      </Box>
      {ConfirmDialog}
    </>
  );
}
