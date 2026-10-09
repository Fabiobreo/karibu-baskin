import { requireAdminPage } from "@/lib/adminAccess";
import { prisma } from "@/lib/db";
import AdminNewsClient from "@/components/admin/AdminNewsClient";
import PageHeader from "@/components/common/PageHeader";

export const metadata = { title: "News | Admin" };

export default async function AdminNewsPage() {
  const { readOnly } = await requireAdminPage("/admin/news");

  const rawPosts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      imageUrl: true,
      publishedAt: true,
      lastNotifiedAt: true,
      createdAt: true,
      updatedAt: true,
      author: { select: { name: true } },
      poll: { select: { id: true, question: true, closesAt: true, multiSelect: true } },
    },
  });

  // Serializza le Date in stringhe ISO per la trasmissione al Client Component
  const posts = rawPosts.map((p) => ({
    ...p,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    lastNotifiedAt: p.lastNotifiedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    poll: p.poll ? { ...p.poll, closesAt: p.poll.closesAt?.toISOString() ?? null } : null,
  }));

  return (
    <>
      <PageHeader
        title="News"
        subtitle="Articoli, sondaggi e comunicazioni del club."
        breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "News" }]}
      />
      <AdminNewsClient initialPosts={posts} readOnly={readOnly} />
    </>
  );
}
