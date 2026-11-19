"use client";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Box, Paper, Typography } from "@mui/material";
import RowActions from "@/components/admin/RowActions";
import BoardSvg from "@/components/board/BoardSvg";
import { formatSuggestionDate } from "@/components/admin/SuggestionThread";
import { useToast } from "@/context/ToastContext";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { readError } from "@/lib/fetchJson";
import { interpolateStep } from "@/lib/board/animation";
import type { AdminProposalRow } from "@/lib/board/loadProposals";
import { adminProposalPath } from "@/lib/board/proposals";
import { DRILL_COURT_LABELS, DRILL_KIND_LABELS } from "@/lib/board/labels";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { RADIUS } from "@/lib/radius";

interface ProposalListProps {
  proposals: AdminProposalRow[];
  readOnly: boolean;
}

/**
 * Scheda "Proposte" del Playbook nel pannello (UX-73): le proposte di esercizi
 * inviate dai tesserati, con chi le ha fatte e quando. "Guarda" apre la
 * proposta con il filo; nel "⋯" "Adotta" e "Non adesso". Le proposte messe da
 * parte stanno in fondo.
 */
export default function ProposalList({ proposals, readOnly }: ProposalListProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { openConfirm, ConfirmDialog } = useConfirmDialog();
  const open = proposals.filter((p) => !p.archived);
  const setAside = proposals.filter((p) => p.archived);

  const act = useMutation({
    mutationFn: async ({ id, what }: { id: string; what: "adopt" | "decline" }) => {
      const res = await fetch(what === "adopt" ? `/api/drills/${id}/adopt` : `/api/drills/${id}`, {
        method: what === "adopt" ? "POST" : "DELETE",
      });
      if (!res.ok) throw new Error(await readError(res));
      return { id, what };
    },
    onSuccess: ({ id, what }) => {
      if (what === "adopt") {
        showToast({ message: "Adottata: ora è una bozza dello staff", severity: "success" });
        router.push(`/admin/playbook/${id}`);
      } else {
        showToast({ message: "Messa da parte", severity: "success" });
        router.refresh();
      }
    },
    onError: (err) => showToast({ message: err.message, severity: "error" }),
  });

  if (proposals.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: "center", borderRadius: RADIUS.lg }}>
        <Typography color="text.secondary">
          Ancora nessuna proposta. Atleti e famiglie propongono un esercizio da “Proponi un
          esercizio” nella pagina degli esercizi.
        </Typography>
      </Paper>
    );
  }

  const row = (p: AdminProposalRow) => (
    <Paper
      key={p.id}
      component="li"
      variant="outlined"
      sx={{
        borderRadius: RADIUS.lg,
        overflow: "hidden",
        display: "grid",
        gridTemplateColumns: { xs: "96px 1fr", sm: "140px 1fr" },
        alignItems: "stretch",
      }}
    >
      <Box sx={{ borderRight: "1px solid", borderColor: "divider" }}>
        <BoardSvg
          court={p.court}
          pieces={p.content.pieces}
          frame={interpolateStep(p.content, 0)}
          title={p.title}
          framed={false}
        />
      </Box>
      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 0.5, minWidth: 0 }}>
        <Typography variant="h6" component="h3">
          {p.title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {p.isNew && !p.archived && (
            <Box component="span" sx={{ color: "text.primary", fontWeight: FONT_WEIGHT.semibold }}>
              Nuova ·{" "}
            </Box>
          )}
          {p.authorName ?? "Utente non più presente"} · {formatSuggestionDate(p.proposedAt)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {DRILL_KIND_LABELS[p.kind]} · {DRILL_COURT_LABELS[p.court]}
        </Typography>
        <Box sx={{ mt: "auto", pt: 1 }}>
          <RowActions
            subject={p.title}
            layout="card"
            primary={{ label: "Guarda", href: adminProposalPath(p.id), emphasis: "outlined" }}
            items={
              readOnly
                ? []
                : [
                    {
                      label: "Adotta",
                      onClick: () =>
                        openConfirm(
                          `Adottare ${p.title}?`,
                          "Diventa una bozza dello staff: la sistemi e la pubblichi quando vuoi. A chi l'ha proposta arriva una risposta: «Lo staff ha preso il tuo esercizio».",
                          () => act.mutate({ id: p.id, what: "adopt" }),
                          { confirmLabel: "Adotta", confirmColor: "primary" }
                        ),
                    },
                    ...(p.archived
                      ? []
                      : [
                          {
                            label: "Non adesso",
                            onClick: () =>
                              openConfirm(
                                "Mettere da parte la proposta?",
                                "Resta a chi l'ha proposta, che la può rileggere. Prima di farlo, rispondigli dalla proposta.",
                                () => act.mutate({ id: p.id, what: "decline" }),
                                { confirmLabel: "Non adesso", confirmColor: "primary" }
                              ),
                          },
                        ]),
                  ]
            }
          />
        </Box>
      </Box>
    </Paper>
  );

  const list = (items: AdminProposalRow[]) => (
    <Box
      component="ul"
      sx={{
        m: 0,
        p: 0,
        listStyle: "none",
        display: "grid",
        gridTemplateColumns: { xs: "1fr", lg: "repeat(2, 1fr)" },
        gap: 2,
      }}
    >
      {items.map(row)}
    </Box>
  );

  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Esercizi proposti da atleti e famiglie, con il loro nome. Se uno vi piace lo adottate:
        diventa una vostra bozza, da sistemare e pubblicare.
      </Typography>
      {open.length > 0 ? (
        list(open)
      ) : (
        <Typography color="text.secondary">Nessuna proposta in attesa.</Typography>
      )}
      {setAside.length > 0 && (
        <Box component="section" sx={{ mt: 4 }}>
          <Typography variant="h6" component="h2" sx={{ mb: 1.5 }}>
            Messe da parte
          </Typography>
          {list(setAside)}
        </Box>
      )}
      {ConfirmDialog}
    </>
  );
}
