import { Box, Link as MuiLink, Paper, Typography } from "@mui/material";
import { getTranslations } from "next-intl/server";
import BoardSvg from "./BoardSvg";
import { interpolateStep } from "@/lib/board/animation";
import { drillPath } from "@/lib/board/category";
import type { MyProposal } from "@/lib/board/loadProposals";
import { proposalEditPath } from "@/lib/board/proposals";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { RADIUS } from "@/lib/radius";

interface MyProposalCardProps {
  proposal: MyProposal;
  /** Le risposte dello staff sul filo collegato, gia' con la data scritta. */
  replies: { id: string; body: string; when: string }[];
}

/**
 * Una proposta di esercizio fra i propri suggerimenti (UX-73): il primo passo
 * del disegno (apre la proposta: l'editor finche' si puo' cambiare, la lettura
 * dopo), lo stato come testo e le risposte dello staff, firmate "Lo staff".
 */
export default async function MyProposalCard({ proposal: p, replies }: MyProposalCardProps) {
  const t = await getTranslations("board.proposal");
  const tProfile = await getTranslations("profile");
  const href = p.state === "published" ? drillPath(p.slug) : proposalEditPath(p.id);
  return (
    <Paper
      id={p.suggestionId ? `s-${p.suggestionId}` : `p-${p.id}`}
      variant="outlined"
      sx={{ borderRadius: RADIUS.lg, overflow: "hidden", scrollMarginTop: 80 }}
    >
      <MuiLink
        href={href}
        underline="none"
        color="inherit"
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "112px 1fr", sm: "160px 1fr" },
          "&:hover h3, &:focus-visible h3": { color: "primary.main" },
        }}
      >
        <Box sx={{ borderRight: "1px solid", borderColor: "divider" }} aria-hidden>
          <BoardSvg
            court={p.court}
            pieces={p.content.pieces}
            frame={interpolateStep(p.content, 0)}
            title={p.title}
            framed={false}
          />
        </Box>
        <Box sx={{ p: 2, minWidth: 0, display: "flex", flexDirection: "column", gap: 0.5 }}>
          <Typography variant="h6" component="h3">
            {p.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <Box component="span" sx={{ color: "text.primary", fontWeight: FONT_WEIGHT.semibold }}>
              {t(`states.${p.state}`)}
            </Box>
          </Typography>
        </Box>
      </MuiLink>
      {replies.length > 0 && (
        <Box sx={{ p: 2, pt: 0, display: "grid", gap: 1 }}>
          {replies.map((n) => (
            <Box
              key={n.id}
              sx={{ border: "1px solid", borderColor: "divider", borderRadius: RADIUS.md, p: 1.5 }}
            >
              <Box sx={{ display: "flex", gap: 1, alignItems: "baseline", flexWrap: "wrap" }}>
                <Typography variant="body2" sx={{ fontWeight: FONT_WEIGHT.semibold }}>
                  {tProfile("mySuggestionsStaff")}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {n.when}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", mt: 0.5 }}>
                {n.body}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  );
}
