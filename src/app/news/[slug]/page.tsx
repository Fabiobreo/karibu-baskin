import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
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
import SiteHeader from "@/components/layout/SiteHeader";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = await prisma.post.findFirst({
    where: { slug, publishedAt: { not: null } },
    select: { title: true },
  });
  return { title: post ? `${post.title} — Karibu Baskin` : "News" };
}

export default async function NewsSlugPage({ params }: Props) {
  const [t, locale] = await Promise.all([getTranslations("pages"), getLocale()]);
  const dateLocale = getDateFnsLocale(locale);
  const { slug } = await params;
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const isStaff = !!session?.user && hasRole(session.user.appRole, "COACH");

  const post = await prisma.post.findFirst({
    where: { slug, publishedAt: { not: null } },
    include: {
      author: { select: { name: true } },
      poll: {
        include: { options: { orderBy: { order: "asc" } } },
      },
    },
  });

  if (!post) notFound();

  const now = new Date();
  const pollClosed = post.poll?.closesAt ? post.poll.closesAt <= now : false;

  // Conteggi voti: visibili a tutti se poll chiuso, oppure sempre per lo staff (anteprima)
  let voteCounts: Record<string, number> | null = null;
  if (post.poll && (pollClosed || isStaff)) {
    const counts = await prisma.pollVote.groupBy({
      by: ["optionId"],
      where: { pollId: post.poll.id },
      _count: { optionId: true },
    });
    voteCounts = Object.fromEntries(counts.map((c) => [c.optionId, c._count.optionId]));
  }

  // Voti dell'utente corrente
  let userVoteOptionIds: string[] = [];
  if (userId && post.poll) {
    const votes = await prisma.pollVote.findMany({
      where: { pollId: post.poll.id, userId },
      select: { optionId: true },
    });
    userVoteOptionIds = votes.map((v) => v.optionId);
  }

  return (
    <>
      <SiteHeader />
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
          <Typography variant="h4" fontWeight={800} sx={{ flex: 1, minWidth: 0 }}>
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
          dangerouslySetInnerHTML={{ __html: post.body }}
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
