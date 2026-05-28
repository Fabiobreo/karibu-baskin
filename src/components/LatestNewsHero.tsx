import { prisma } from "@/lib/db";
import Link from "next/link";
import { Box, Container, Typography, Chip, Grid2 as Grid, Stack } from "@mui/material";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import ArticleIcon from "@mui/icons-material/Article";
import NewspaperIcon from "@mui/icons-material/Newspaper";

const FEATURED_TEASER_LEN = 160;
const SIDE_TEASER_LEN = 70;

function stripHtml(html: string, len: number): string {
  const plain = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > len ? plain.slice(0, len).trimEnd() + "…" : plain;
}

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
              Aggiornamenti
            </Typography>
            <Typography
              variant="h5"
              fontWeight={800}
              sx={{ mt: 0.25, fontSize: { xs: "1.4rem", md: "1.6rem" } }}
            >
              Ultime news
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: side.length > 0 ? 7 : 12 }}>
            <FeaturedCard post={featured} />
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
              Vedi tutte →
            </Typography>
          </Link>
        </Box>
      </Container>
    </Box>
  );
}

type PostItem = {
  id: string;
  slug: string;
  title: string;
  body: string;
  imageUrl: string | null;
  publishedAt: Date | null;
  poll: { id: string; closesAt: Date | null } | null;
};

function PollChip({ poll }: { poll: PostItem["poll"] }) {
  if (!poll) return null;
  const closed = poll.closesAt ? new Date(poll.closesAt) <= new Date() : false;
  return (
    <Chip
      icon={<HowToVoteIcon sx={{ fontSize: 16 }} />}
      label={closed ? "Sondaggio chiuso" : "Sondaggio"}
      size="small"
      color={closed ? "default" : "primary"}
      sx={{ fontWeight: 700 }}
    />
  );
}

function FeaturedCard({ post }: { post: PostItem }) {
  const teaser = stripHtml(post.body, FEATURED_TEASER_LEN);

  return (
    <Link href={`/news/${post.slug}`} style={{ textDecoration: "none", display: "block" }}>
      <Box
        sx={{
          position: "relative",
          height: { xs: 280, sm: 360, md: "100%" },
          minHeight: { md: 380 },
          borderRadius: 2,
          overflow: "hidden",
          border: "1px solid",
          borderColor: "divider",
          bgcolor: post.imageUrl ? "common.black" : "background.paper",
          transition: "transform 0.2s, border-color 0.15s",
          "&:hover": {
            borderColor: "primary.main",
            "& .featured-img": { transform: "scale(1.04)" },
          },
        }}
      >
        {post.imageUrl ? (
          <>
            <Box
              className="featured-img"
              sx={{
                position: "absolute",
                inset: 0,
                backgroundImage: `url(${post.imageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                transition: "transform 0.4s ease",
              }}
            />
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.15) 100%)",
              }}
            />
          </>
        ) : (
          <>
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                bgcolor: "grey.900",
              }}
            />
            <Box
              sx={{
                position: "absolute",
                top: "50%",
                right: { xs: -40, md: -60 },
                transform: "translateY(-50%)",
                color: "rgba(255,255,255,0.05)",
                pointerEvents: "none",
              }}
            >
              <ArticleIcon sx={{ fontSize: { xs: 240, md: 320 } }} />
            </Box>
          </>
        )}

        <Box
          sx={{
            position: "relative",
            zIndex: 1,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            p: { xs: 2.5, sm: 3, md: 4 },
            color: "#fff",
          }}
        >
          <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
            <Chip
              icon={<ArticleIcon sx={{ fontSize: 16, color: "inherit !important" }} />}
              label="In evidenza"
              size="small"
              sx={{
                bgcolor: "primary.main",
                color: "#fff",
                fontWeight: 700,
                "& .MuiChip-icon": { color: "#fff" },
              }}
            />
            <PollChip poll={post.poll} />
          </Stack>

          <Typography
            variant="h5"
            fontWeight={800}
            sx={{
              color: "#fff",
              fontSize: { xs: "1.3rem", sm: "1.5rem", md: "1.75rem" },
              lineHeight: 1.2,
              mb: 1,
              textShadow: "0 2px 8px rgba(0,0,0,0.4)",
            }}
          >
            {post.title}
          </Typography>

          {teaser && (
            <Typography
              variant="body2"
              sx={{
                color: "rgba(255,255,255,0.92)",
                lineHeight: 1.55,
                mb: 1.5,
                display: { xs: "none", sm: "-webkit-box" },
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                textShadow: "0 1px 4px rgba(0,0,0,0.5)",
              }}
            >
              {teaser}
            </Typography>
          )}

          {post.publishedAt && (
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>
              {format(new Date(post.publishedAt), "d MMMM yyyy", { locale: it })}
            </Typography>
          )}
        </Box>
      </Box>
    </Link>
  );
}

function SideCard({ post }: { post: PostItem }) {
  const teaser = stripHtml(post.body, SIDE_TEASER_LEN);

  return (
    <Link href={`/news/${post.slug}`} style={{ textDecoration: "none", display: "block" }}>
      <Box
        sx={{
          display: "flex",
          gap: 1.5,
          p: 1.5,
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          transition: "border-color 0.15s, transform 0.15s",
          "&:hover": {
            borderColor: "primary.main",
            transform: "translateX(2px)",
          },
        }}
      >
        <Box
          sx={{
            width: 90,
            height: 90,
            flexShrink: 0,
            borderRadius: 1.5,
            overflow: "hidden",
            backgroundImage: post.imageUrl ? `url(${post.imageUrl})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            bgcolor: post.imageUrl ? "transparent" : "action.hover",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {!post.imageUrl &&
            (post.poll ? (
              <HowToVoteIcon sx={{ fontSize: 32, color: "primary.main" }} />
            ) : (
              <ArticleIcon sx={{ fontSize: 32, color: "text.disabled" }} />
            ))}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          {post.poll && (
            <Box sx={{ mb: 0.5 }}>
              <PollChip poll={post.poll} />
            </Box>
          )}
          <Typography
            variant="subtitle2"
            fontWeight={700}
            sx={{
              color: "text.primary",
              lineHeight: 1.3,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {post.title}
          </Typography>
          {teaser && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                mt: 0.5,
                display: { xs: "none", sm: "-webkit-box" },
                WebkitLineClamp: 1,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {teaser}
            </Typography>
          )}
          {post.publishedAt && (
            <Typography variant="caption" color="text.disabled" sx={{ mt: "auto", pt: 0.5 }}>
              {format(new Date(post.publishedAt), "d MMM yyyy", { locale: it })}
            </Typography>
          )}
        </Box>
      </Box>
    </Link>
  );
}
