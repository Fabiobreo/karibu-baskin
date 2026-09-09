import { redirect } from "next/navigation";
import { auth } from "@/lib/authjs";
import { hasRole } from "@/lib/authRoles";
import { prisma } from "@/lib/db";
import AdminNewsClient from "@/components/admin/AdminNewsClient";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

export const metadata = { title: "News | Admin" };

export default async function AdminNewsPage() {
  const session = await auth();
  if (!session?.user || !hasRole(session.user.appRole, "COACH")) {
    redirect("/admin/login");
  }

  const rawPosts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      imageUrl: true,
      publishedAt: true,
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
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    poll: p.poll ? { ...p.poll, closesAt: p.poll.closesAt?.toISOString() ?? null } : null,
  }));

  return (
    <>
      <AdminPageHeader
        title="Gestione News"
        subtitle="Articoli, sondaggi e comunicazioni del club."
        breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "News" }]}
      />
      <AdminNewsClient initialPosts={posts} />
    </>
  );
}
