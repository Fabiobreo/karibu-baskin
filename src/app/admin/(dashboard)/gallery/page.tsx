import { prisma } from "@/lib/db";
import AdminGalleryClient from "@/components/admin/AdminGalleryClient";
import PageHeader from "@/components/common/PageHeader";
import { isInstagramConfigured } from "@/lib/gallery/instagram";
import { isYouTubeConfigured } from "@/lib/gallery/youtube";
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
      <PageHeader
        title="Gallery"
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
