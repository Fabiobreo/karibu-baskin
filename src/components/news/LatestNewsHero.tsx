import { prisma } from "@/lib/db";
import Link from "next/link";
import { Box, Container, Typography, Grid2 as Grid, Stack } from "@mui/material";
import NewspaperIcon from "@mui/icons-material/Newspaper";
import { getTranslations } from "next-intl/server";
import FeaturedCard from "@/components/news/FeaturedCard";
import SideCard from "@/components/news/SideCard";

export type PostItem = {
  id: string;
  slug: string;
  title: string;
  body: string;
  imageUrl: string | null;
  publishedAt: Date | null;
  poll: { id: string; closesAt: Date | null } | null;
};

export default async function LatestNewsHero() {
  const posts = await prisma.post.findMany({
    where: { publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
    take: 4,
    select: {
      id: true,
      slug: true,
      title: true,
      body: true,
      imageUrl: true,
      publishedAt: true,
      poll: { select: { id: true, closesAt: true } },
    },
  });
  const [t, tm] = await Promise.all([getTranslations("home"), getTranslations("matches")]);

  if (posts.length === 0) return null;

  const [featured, ...rest] = posts;
  const side = rest.slice(0, 3);

  return (
    <Box sx={{ bgcolor: "action.hover", py: { xs: 4, md: 6 } }}>
      <Container maxWidth="md">
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
          <NewspaperIcon sx={{ color: "primary.main", fontSize: 32 }} />
          <Box>
            <Typography
              variant="overline"
              color="primary"
              fontWeight={700}
              sx={{ letterSpacing: "0.1em", lineHeight: 1 }}
            >
              {t("updates")}
            </Typography>
            <Typography
              variant="h5"
              fontWeight={800}
              sx={{ mt: 0.25, fontSize: { xs: "1.4rem", md: "1.6rem" } }}
            >
              {t("latestNews")}
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: side.length > 0 ? 7 : 12 }}>
            <FeaturedCard post={featured} featuredLabel={t("featured")} />
          </Grid>

          {side.length > 0 && (
            <Grid size={{ xs: 12, md: 5 }}>
              <Stack spacing={2} sx={{ height: "100%" }}>
                {side.map((p) => (
                  <SideCard key={p.id} post={p} />
                ))}
              </Stack>
            </Grid>
          )}
        </Grid>

        <Box sx={{ textAlign: "right", mt: 2 }}>
          <Link href="/news" style={{ textDecoration: "none" }}>
            <Typography
              variant="body2"
              color="primary"
              sx={{ fontWeight: 700, "&:hover": { textDecoration: "underline" } }}
            >
              {tm("homeSeeAll")}
            </Typography>
          </Link>
        </Box>
      </Container>
    </Box>
  );
}
