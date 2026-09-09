import { prisma } from "@/lib/db";
import { Box, Container, Button, Divider } from "@mui/material";
import InstagramIcon from "@mui/icons-material/Instagram";
import CollectionsIcon from "@mui/icons-material/Collections";
import { getTranslations } from "next-intl/server";
import SiteHeader from "@/components/layout/SiteHeader";
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
  const t = await getTranslations("pages");

  const [posts, videos] = await Promise.all([
    prisma.instagramPost.findMany({
      where: { hidden: false },
      orderBy: { timestamp: "desc" },
      select: { id: true, caption: true, mediaType: true, permalink: true, blobUrls: true },
    }),
    getChannelVideos(9),
  ]);

  const hasContent = posts.length > 0 || videos.length > 0;

  return (
    <>
      <SiteHeader />

      <PageHero chip={t("gallery.heroChip")} title="Gallery" subtitle={t("gallery.heroSubtitle")} />

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        {!hasContent ? (
          <EmptyState
            icon={<CollectionsIcon sx={{ fontSize: 56, color: "text.disabled" }} />}
            title={t("gallery.empty")}
            message={t("gallery.emptyDesc")}
            action={
              <Button
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
            {posts.length > 0 && (
              <Box>
                <GalleryGrid posts={posts} />
                <Box sx={{ textAlign: "center", mt: 4 }}>
                  <Button
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
