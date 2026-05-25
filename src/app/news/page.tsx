import { prisma } from "@/lib/db";
import { Box, Typography, Container, Chip, Paper } from "@mui/material";
import { alpha } from "@mui/material/styles";
import Link from "next/link";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import ArticleIcon from "@mui/icons-material/Article";
import SiteHeader from "@/components/SiteHeader";

export const metadata = { title: "News — Karibu Baskin" };
export const revalidate = 60;

export default async function NewsPage() {
  const posts = await prisma.post.findMany({
    where: { publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      body: true,
      publishedAt: true,
      author: { select: { name: true } },
      poll: { select: { id: true, question: true, closesAt: true } },
    },
  });

  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <Box
        sx={{
          background: "linear-gradient(150deg, #1A1A1A 0%, #2D1A0A 60%, #3D2010 100%)",
          color: "#fff",
          py: { xs: 6, md: 9 },
          px: 2,
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 260,
            height: 260,
            borderRadius: "50%",
            backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.1),
            pointerEvents: "none",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: -80,
            left: -80,
            width: 320,
            height: 320,
            borderRadius: "50%",
            backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.06),
            pointerEvents: "none",
          }}
        />
        <Container maxWidth="md" sx={{ position: "relative", zIndex: 1 }}>
          <Chip
            label="Aggiornamenti"
            color="primary"
            size="small"
            sx={{ mb: 2, fontWeight: 700 }}
          />
          <Typography
            variant="h3"
            fontWeight={800}
            sx={{ mb: 2, fontSize: { xs: "2rem", md: "2.8rem" } }}
          >
            News
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: "rgba(255,255,255,0.65)",
              fontWeight: 400,
              maxWidth: 520,
              mx: "auto",
              fontSize: { xs: "1rem", md: "1.1rem" },
            }}
          >
            Comunicazioni, aggiornamenti e sondaggi dalla squadra.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        {posts.length === 0 && (
          <Typography color="text.secondary" sx={{ textAlign: "center", py: 8 }}>
            Nessun articolo pubblicato ancora.
          </Typography>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {posts.map((post) => {
            // Estrai un breve teaser dal body HTML (rimuove tag)
            const teaser = post.body
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 180);

            const isClosed = post.poll?.closesAt
              ? new Date(post.poll.closesAt) <= new Date()
              : false;

            return (
              <Paper
                key={post.id}
                variant="outlined"
                component={Link}
                href={`/news/${post.slug}`}
                sx={{
                  p: { xs: 2, sm: 3 },
                  textDecoration: "none",
                  display: "block",
                  transition: "border-color 0.15s",
                  "&:hover": { borderColor: "primary.main" },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mb: 1 }}>
                  {post.poll ? (
                    <HowToVoteIcon fontSize="small" sx={{ color: "primary.main", mt: 0.3 }} />
                  ) : (
                    <ArticleIcon fontSize="small" sx={{ color: "text.secondary", mt: 0.3 }} />
                  )}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" fontWeight={700} sx={{ color: "text.primary" }}>
                      {post.title}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        {format(new Date(post.publishedAt!), "d MMMM yyyy", { locale: it })}
                      </Typography>
                      {post.author.name && (
                        <>
                          <Typography variant="caption" color="text.disabled">
                            ·
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {post.author.name}
                          </Typography>
                        </>
                      )}
                      {post.poll && (
                        <Chip
                          label={isClosed ? "Sondaggio chiuso" : "Sondaggio aperto"}
                          size="small"
                          color={isClosed ? "default" : "primary"}
                          sx={{ ml: 0.5 }}
                        />
                      )}
                    </Box>
                  </Box>
                </Box>
                {teaser && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {teaser}
                    {post.body.replace(/<[^>]+>/g, "").trim().length > 180 ? "…" : ""}
                  </Typography>
                )}
              </Paper>
            );
          })}
        </Box>
      </Container>
    </>
  );
}
