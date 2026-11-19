import { notFound, redirect } from "next/navigation";
import { Alert, Box, Button, Container, Typography } from "@mui/material";
import { getTranslations } from "next-intl/server";
import PageHeader from "@/components/common/PageHeader";
import MembersOnlyNotice from "@/components/common/MembersOnlyNotice";
import DrillPlayer from "@/components/board/DrillPlayer";
import ProposalEditor from "@/components/board/ProposalEditor";
import ProposalStartForm from "@/components/board/ProposalStartForm";
import { auth } from "@/lib/authjs";
import { prisma } from "@/lib/db";
import { categoryPath, drillPath } from "@/lib/board/category";
import { loadMyProposal } from "@/lib/board/loadProposals";
import { MAX_PENDING_PROPOSALS, canPropose, pendingProposalsWhere } from "@/lib/board/proposals";
import { columnSx } from "@/lib/layout";
import { loginHref } from "@/lib/loginReturn";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Proponi un esercizio",
  description: "Disegna un esercizio con il Playbook e mandalo allo staff del Karibu.",
  path: "/playbook/proponi",
  noindex: true,
});

type Props = { searchParams: Promise<{ id?: string | string[] }> };

/**
 * Proporre un esercizio (UX-73): senza `?id` il primo passo (titolo, tipo,
 * campo), con `?id` l'editor della propria proposta, o la sua lettura quando
 * lo staff ha gia' deciso. Solo i tesserati; a chi non lo e' l'avviso, e la
 * proposta di un altro non esiste (404).
 */
export default async function ProposeDrillPage({ searchParams }: Props) {
  const [session, sp, t] = await Promise.all([auth(), searchParams, getTranslations("board")]);
  const raw = sp.id;
  const id = typeof raw === "string" ? raw : undefined;
  const path = id ? `/playbook/proponi?id=${encodeURIComponent(id)}` : "/playbook/proponi";
  if (!session?.user?.id) redirect(loginHref(path));

  const userId = session.user.id;
  const member = canPropose(session.user.appRole);
  const [proposal, pending] = member
    ? await Promise.all([
        id ? loadMyProposal(id, userId) : Promise.resolve(null),
        id ? Promise.resolve(0) : prisma.drill.count({ where: pendingProposalsWhere(userId) }),
      ])
    : [null, 0];
  // Prima di qualunque Suspense: un 404 vero.
  if (member && id && !proposal) notFound();

  const breadcrumb = [
    { label: t("tabExercises"), href: categoryPath("exercises") },
    { label: t("proposal.pageTitle") },
  ];
  const firstName = session.user.name?.trim().split(/\s+/)[0] || null;
  const editable = proposal && (proposal.state === "draft" || proposal.state === "sent");

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Box sx={columnSx("main")}>
        <PageHeader
          title={proposal ? proposal.title : t("proposal.pageTitle")}
          breadcrumb={breadcrumb}
        />

        {!member ? (
          <MembersOnlyNotice viewer="guest" what="proposals" variant="block" />
        ) : !proposal ? (
          <>
            <Typography variant="body1" sx={{ mb: 1 }}>
              {t("proposal.intro")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t("proposal.signed")}
            </Typography>
            {pending >= MAX_PENDING_PROPOSALS ? (
              <Alert
                severity="info"
                action={
                  <Button color="inherit" href="/profilo/suggerimenti">
                    {t("proposal.yourProposals")}
                  </Button>
                }
              >
                {t("proposal.limitReached", { max: MAX_PENDING_PROPOSALS })}
              </Alert>
            ) : (
              <ProposalStartForm />
            )}
          </>
        ) : editable ? (
          <ProposalEditor proposal={proposal} firstName={firstName} />
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              <Box component="strong" sx={{ color: "text.primary" }}>
                {t(`proposal.states.${proposal.state}`)}
              </Box>
              {" · "}
              {t(`proposal.${proposal.state}Hint`)}
            </Typography>
            {proposal.description && (
              <Typography variant="body1" sx={{ mb: 3, whiteSpace: "pre-line" }}>
                {proposal.description}
              </Typography>
            )}
            <DrillPlayer title={proposal.title} court={proposal.court} content={proposal.content} />
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mt: 3 }}>
              {proposal.state === "published" && (
                <Button variant="contained" href={drillPath(proposal.slug)}>
                  {t("proposal.openOnBoard")}
                </Button>
              )}
              <Button
                variant="outlined"
                href={
                  proposal.suggestionId
                    ? `/profilo/suggerimenti#s-${proposal.suggestionId}`
                    : "/profilo/suggerimenti"
                }
              >
                {t("proposal.mySuggestions")}
              </Button>
            </Box>
          </>
        )}
      </Box>
    </Container>
  );
}
