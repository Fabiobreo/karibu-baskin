import { notFound, redirect } from "next/navigation";
import AdminProposalClient from "@/components/admin/board/AdminProposalClient";
import { requireAdminPage } from "@/lib/adminAccess";
import { hasRole } from "@/lib/authRoles";
import { prisma } from "@/lib/db";
import { loadAdminProposal, markProposalSeen } from "@/lib/board/loadProposals";

export const dynamic = "force-dynamic";

/**
 * Una proposta di esercizio di un tesserato (UX-73): visore, filo del
 * suggerimento e "Adotta". Il dirigente la legge. Una proposta gia' adottata
 * e' un esercizio dello staff: si apre nell'editor.
 */
export default async function AdminProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { session, readOnly } = await requireAdminPage("/admin/playbook");
  const { id } = await params;
  const proposal = await loadAdminProposal(id);
  if (!proposal) {
    const adopted = await prisma.drill.findFirst({
      where: { id, adoptedAt: { not: null } },
      select: { id: true },
    });
    if (adopted) redirect(`/admin/playbook/${id}`);
    notFound();
  }
  // Aperta da un allenatore o da un admin: non e' piu' "nuova" (il dirigente
  // legge soltanto e non la toglie dal numero dello staff).
  if (!readOnly && proposal.suggestion?.status === "NUOVO") {
    await markProposalSeen(proposal.suggestion.id);
    proposal.suggestion = { ...proposal.suggestion, status: "LETTO" };
  }
  return (
    <AdminProposalClient
      proposal={proposal}
      readOnly={readOnly}
      currentUserId={session.user.id}
      isAdmin={hasRole(session.user.appRole, "ADMIN")}
    />
  );
}
