import { prisma } from "@/lib/db";
import AdminGalleryClient from "@/components/admin/AdminGalleryClient";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { isInstagramConfigured } from "@/lib/instagram";
import { isYouTubeConfigured } from "@/lib/youtube";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Gestione Gallery | Admin" };
export const revalidate = 0;

export default async function AdminGalleryPage() {
  const posts = await prisma.instagramPost.findMany({
    orderBy: { timestamp: "desc" },
    select: {
      id: true,
      caption: true,
      mediaType: true,
      permalink: true,
      blobUrls: true,
      hidden: true,
      timestamp: true,
    },
  });

  return (
    <>
      <AdminPageHeader
        title="Gestione Gallery"
        subtitle="Feed Instagram e video del club mostrati nella pagina pubblica /gallery."
        breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Gallery" }]}
      />
      <AdminGalleryClient
        initialPosts={posts.map((p) => ({ ...p, timestamp: p.timestamp.toISOString() }))}
        instagramConfigured={isInstagramConfigured()}
        youtubeConfigured={isYouTubeConfigured()}
      />
    </>
  );
}
