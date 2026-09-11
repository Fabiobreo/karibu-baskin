import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { sanitizePostHtml } from "@/lib/sanitizeHtml";
import JsonLd from "@/components/common/JsonLd";
import { newsArticleJsonLd } from "@/lib/structuredData";
import { auth } from "@/lib/authjs";
import { buildMetadata } from "@/lib/seo";
import { hasRole } from "@/lib/authRoles";
import { notFound } from "next/navigation";
import {
  Container,
  Box,
  Typography,
  Chip,
  Divider,
  Breadcrumbs,
  IconButton,
  Tooltip,
  Link as MuiLink,
} from "@mui/material";
import { format } from "date-fns";
import { getTranslations, getLocale } from "next-intl/server";
import { getDateFnsLocale } from "@/lib/dateLocale";
import Link from "next/link";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import EditIcon from "@mui/icons-material/Edit";
import PollWidget from "@/components/news/PollWidget";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

/** Estrae un riassunto leggibile dal body HTML sanitizzato di TipTap. */
function excerpt(html: string, max = 160): string {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  // Taglia all'ultimo spazio per non troncare a metà parola.
  return `${text.slice(0, max).replace(/\s+\S*$/, "")}…`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await prisma.post.findFirst({
    where: { slug, publishedAt: { not: null } },
    select: { title: true, body: true, imageUrl: true, publishedAt: true },
  });

  if (!post) {
    return buildMetadata({
      title: "News non trovata",
      description: "Questa notizia non esiste o non è più pubblicata.",
      path: `/news/${slug}`,
      noindex: true,
    });
  }

  return buildMetadata({
    title: post.title,
    description: excerpt(post.body) || `${post.title}. Una notizia dal Karibu Baskin.`,
    path: `/news/${slug}`,
    type: "article",
    publishedTime: post.publishedAt?.toISOString(),
    // La copertina del post è un'anteprima migliore della card generica del sito.
    image: post.imageUrl ?? undefined,
  });
}

export default async function NewsSlugPage({ params }: Props) {
  const { slug } = await params;
  const [t, locale, session, post] = await Promise.all([
    getTranslations("pages"),
    getLocale(),
    auth(),
    prisma.post.findFirst({
      where: { slug, publishedAt: { not: null } },
      include: {
        author: { select: { name: true } },
        poll: {
          include: { options: { orderBy: { order: "asc" } } },
        },
      },
    }),
  ]);
  const dateLocale = getDateFnsLocale(locale);
  const userId = session?.user?.id ?? null;
  const isStaff = !!session?.user && hasRole(session.user.appRole, "COACH");

  if (!post) notFound();

  const now = new Date();
  const pollClosed = post.poll?.closesAt ? post.poll.closesAt <= now : false;

  const [counts, votes] = await Promise.all([
    // Conteggi voti: visibili a tutti se poll chiuso, oppure sempre per lo staff (anteprima)
    post.poll && (pollClosed || isStaff)
      ? prisma.pollVote.groupBy({
          by: ["optionId"],
          where: { pollId: post.poll.id },
          _count: { optionId: true },
        })
      : null,
    // Voti dell'utente corrente
    userId && post.poll
      ? prisma.pollVote.findMany({
          where: { pollId: post.poll.id, userId },
          select: { optionId: true },
        })
      : [],
  ]);
  const voteCounts: Record<string, number> | null = counts
    ? Object.fromEntries(counts.map((c) => [c.optionId, c._count.optionId]))
    : null;
  const userVoteOptionIds: string[] = votes.map((v) => v.optionId);

  return (
    <>
      <JsonLd
        data={newsArticleJsonLd({
          title: post.title,
          description: excerpt(post.body) || post.title,
          slug,
          publishedAt: post.publishedAt!,
          imageUrl: post.imageUrl,
          authorName: post.author.name,
        })}
      />
      {post.imageUrl && (
        <Box
          sx={{
            width: "100%",
            aspectRatio: { xs: "16 / 9", md: "21 / 8" },
            maxHeight: 420,
            backgroundImage: `url(${post.imageUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}
      <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 3 }}>
          <MuiLink href="/news" underline="hover" color="text.secondary" variant="body2">
            News
          </MuiLink>
          <Typography variant="body2" color="text.primary" noWrap sx={{ maxWidth: 300 }}>
            {post.title}
          </Typography>
        </Breadcrumbs>

        <Box sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
          {post.poll && <HowToVoteIcon fontSize="small" sx={{ color: "primary.main" }} />}
          <Typography variant="h4" component="h1" fontWeight={800} sx={{ flex: 1, minWidth: 0 }}>
            {post.title}
          </Typography>
          {isStaff && (
            <Link href={`/admin/news?edit=${post.id}`} style={{ textDecoration: "none" }}>
              <Tooltip title={t("news.editNews")}>
                <IconButton component="span" size="small" sx={{ color: "primary.main" }}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Link>
          )}
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
          <Typography variant="caption" color="text.secondary">
            {format(new Date(post.publishedAt!), "d MMMM yyyy", { locale: dateLocale })}
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
              label={pollClosed ? t("news.pollClosed") : t("news.pollOpen")}
              size="small"
              color={pollClosed ? "default" : "primary"}
              sx={{ ml: 0.5 }}
            />
          )}
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Body HTML sanitizzato — sicuro poiché sanitizzato server-side al salvataggio */}
        <Box
          sx={{
            "& p": { my: 1, lineHeight: 1.7 },
            "& ul, & ol": { pl: 3, my: 1 },
            "& li": { mb: 0.5 },
            "& blockquote": {
              borderLeft: "3px solid",
              borderColor: "divider",
              pl: 2,
              ml: 0,
              color: "text.secondary",
              fontStyle: "italic",
              my: 2,
            },
            "& a": { color: "primary.main" },
            "& strong": { fontWeight: 700 },
            fontSize: "1rem",
            lineHeight: 1.7,
            color: "text.primary",
          }}
          // Il corpo e' gia' sanificato in scrittura (api/posts). Qui di nuovo: un
          // contenuto entrato prima del sanitizer, importato o modificato a mano
          // sul database verrebbe altrimenti reso cosi' com'e' (KB-29).
          dangerouslySetInnerHTML={{ __html: sanitizePostHtml(post.body) }}
        />

        {post.poll && (
          <PollWidget
            pollId={post.poll.id}
            question={post.poll.question}
            multiSelect={post.poll.multiSelect}
            closesAt={post.poll.closesAt?.toISOString() ?? null}
            options={post.poll.options}
            voteCounts={voteCounts}
            userVoteOptionIds={userVoteOptionIds}
            isLoggedIn={!!userId}
            postSlug={post.slug}
          />
        )}
      </Container>
    </>
  );
}
