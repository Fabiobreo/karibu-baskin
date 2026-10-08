import { prisma } from "@/lib/db";
import AdminGalleryView from "@/components/admin/AdminGalleryView";
import type { AlbumLinkOption } from "@/components/admin/AlbumFormDialog";
import { isInstagramConfigured } from "@/lib/gallery/instagram";
import { isYouTubeConfigured } from "@/lib/gallery/youtube";
import { isDriveConfigured } from "@/lib/gallery/drive";
import { loadAlbumCards } from "@/lib/gallery/albums";
import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/adminAccess";

export const metadata: Metadata = { title: "Gestione Gallery | Admin" };
export const revalidate = 0;

/** Quanti eventi e partite recenti proporre per il collegamento di un album. */
const LINK_OPTIONS = 60;

const day = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Rome",
});

export default async function AdminGalleryPage() {
  const { readOnly } = await requireAdminPage("/admin/gallery");
  const [posts, albums, events, matches] = await Promise.all([
    prisma.instagramPost.findMany({
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
    }),
    loadAlbumCards({}),
    prisma.event.findMany({
      orderBy: { date: "desc" },
      take: LINK_OPTIONS,
      select: { id: true, title: true, date: true },
    }),
    prisma.match.findMany({
      orderBy: { date: "desc" },
      take: LINK_OPTIONS,
      select: {
        id: true,
        date: true,
        team: { select: { name: true } },
        opponent: { select: { name: true } },
        opponentTeam: { select: { name: true } },
      },
    }),
  ]);

  const linkOptions: AlbumLinkOption[] = [
    ...events.map((e) => ({
      kind: "event" as const,
      id: e.id,
      label: `${e.title}, ${day.format(e.date)}`,
    })),
    ...matches.map((m) => ({
      kind: "match" as const,
      id: m.id,
      label: `${m.team.name} - ${m.opponent?.name ?? m.opponentTeam?.name ?? "?"}, ${day.format(m.date)}`,
    })),
  ];

  return (
    <AdminGalleryView
      header={{
        title: "Gallery",
        subtitle: "Album da Google Drive, feed Instagram e video mostrati in /gallery.",
        breadcrumb: [{ label: "Dashboard", href: "/admin" }, { label: "Gallery" }],
      }}
      initialAlbums={albums}
      linkOptions={linkOptions}
      driveConfigured={isDriveConfigured()}
      readOnly={readOnly}
      instagram={{
        initialPosts: posts.map((p) => ({ ...p, timestamp: p.timestamp.toISOString() })),
        instagramConfigured: isInstagramConfigured(),
        youtubeConfigured: isYouTubeConfigured(),
      }}
    />
  );
}
