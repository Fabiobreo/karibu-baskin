import { prisma } from "@/lib/db";
import { Box, Container, Button, Divider, Link as MuiLink, Typography } from "@mui/material";
import InstagramIcon from "@mui/icons-material/Instagram";
import CollectionsIcon from "@mui/icons-material/Collections";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/authjs";
import { isMemberRole } from "@/lib/authRoles";
import { loginHref } from "@/lib/loginReturn";
import AlbumCards from "@/components/gallery/AlbumCards";
import { loadAlbumCards } from "@/lib/gallery/albums";
import { LISTED_ALBUM_WHERE, visibleAlbumWhere } from "@/lib/gallery/albumRules";
import PageHero from "@/components/common/PageHero";
import EmptyState from "@/components/common/EmptyState";
import GalleryGrid from "@/components/gallery/GalleryGrid";
import YouTubeSection from "@/components/gallery/YouTubeSection";
import { getChannelVideos } from "@/lib/gallery/youtube";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Gallery",
  description:
    "Foto e video del Karibu Baskin di Montecchio Maggiore: allenamenti, partite e momenti della squadra.",
  path: "/gallery",
});

// I post sono aggiornati dal cron; rivalido la pagina ogni 30 minuti.
export const revalidate = 1800;

const INSTAGRAM_URL = "https://www.instagram.com/karibubaskin";

export default async function GalleryPage() {
  const [t, locale, session] = await Promise.all([getTranslations("pages"), getLocale(), auth()]);
  const viewerIsMember = isMemberRole(session?.user?.appRole);

  const [posts, videos, albums, hiddenAlbums] = await Promise.all([
    prisma.instagramPost.findMany({
      where: { hidden: false },
      orderBy: { timestamp: "desc" },
      select: { id: true, caption: true, mediaType: true, permalink: true, blobUrls: true },
    }),
    getChannelVideos(9),
    loadAlbumCards(visibleAlbumWhere(viewerIsMember)),
    // Solo il numero: a chi non è tesserato si dice che esistono, non quali.
    viewerIsMember
      ? 0
      : prisma.photoAlbum.count({ where: { ...LISTED_ALBUM_WHERE, visibility: "MEMBERS" } }),
  ]);

  const hasAlbums = albums.length > 0 || hiddenAlbums > 0;
  const hasContent = posts.length > 0 || videos.length > 0 || hasAlbums;
  const dateFormat = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Rome",
  });

  return (
    <>
      <PageHero title="Gallery" subtitle={t("gallery.heroSubtitle")} />

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        {!hasContent ? (
          <EmptyState
            icon={<CollectionsIcon sx={{ fontSize: 56, color: "text.disabled" }} />}
            title={t("gallery.empty")}
            message={t("gallery.emptyDesc")}
            action={
              <Button
                size="large"
                component="a"
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                variant="contained"
                startIcon={<InstagramIcon />}
              >
                {t("gallery.goInstagram")}
              </Button>
            }
          />
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {hasAlbums && (
              <Box component="section" aria-labelledby="gallery-albums">
                <Typography id="gallery-albums" variant="h4" component="h2" sx={{ mb: 3 }}>
                  {t("gallery.albumsTitle")}
                </Typography>
                {albums.length > 0 && (
                  <AlbumCards
                    albums={albums.map((album) => ({
                      slug: album.slug,
                      title: album.title,
                      dateLabel: dateFormat.format(new Date(album.date)),
                      countLabel: t("gallery.albumCount", { count: album.photoCount }),
                      coverFileId: album.coverFileId,
                      membersLabel:
                        album.visibility === "MEMBERS" ? t("gallery.albumMembersOnly") : null,
                    }))}
                  />
                )}
                {hiddenAlbums > 0 && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: albums.length > 0 ? 2 : 0 }}
                  >
                    {t("gallery.albumsMoreForMembers")}{" "}
                    {/* L'ospite ha già fatto l'accesso: per lui niente link. */}
                    {!session?.user && (
                      <MuiLink href={loginHref("/gallery")}>{t("gallery.albumsLogin")}</MuiLink>
                    )}
                  </Typography>
                )}
              </Box>
            )}

            {hasAlbums && (posts.length > 0 || videos.length > 0) && <Divider />}

            {posts.length > 0 && (
              <Box>
                <GalleryGrid posts={posts} />
                <Box sx={{ textAlign: "center", mt: 4 }}>
                  <Button
                    size="large"
                    component="a"
                    href={INSTAGRAM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="outlined"
                    startIcon={<InstagramIcon />}
                  >
                    {t("gallery.followInstagram")}
                  </Button>
                </Box>
              </Box>
            )}

            {posts.length > 0 && videos.length > 0 && <Divider />}

            {videos.length > 0 && <YouTubeSection videos={videos} />}
          </Box>
        )}
      </Container>
    </>
  );
}
