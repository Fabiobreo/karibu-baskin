import { prisma } from "@/lib/db";
import { Box, Typography, Container, Chip, Paper } from "@mui/material";
import Link from "next/link";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import ArticleIcon from "@mui/icons-material/Article";
import SiteHeader from "@/components/SiteHeader";
import PageHero from "@/components/PageHero";
import EmptyState from "@/components/EmptyState";

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

      <PageHero
        chip="Aggiornamenti"
        title="News"
        subtitle="Comunicazioni, aggiornamenti e sondaggi dalla squadra."
        subtitleMaxWidth={520}
      />

      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        {posts.length === 0 && (
          <EmptyState
            icon={<ArticleIcon sx={{ fontSize: 56, color: "text.disabled" }} />}
            title="Nessun articolo pubblicato ancora."
          />
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
              <Link
                key={post.id}
                href={`/news/${post.slug}`}
                style={{ textDecoration: "none", display: "block" }}
              >
                <Paper
                  variant="outlined"
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
              </Link>
            );
          })}
        </Box>
      </Container>
    </>
  );
}
