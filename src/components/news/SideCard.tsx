"use client";

import Link from "next/link";
import { Box, Typography } from "@mui/material";
import { format } from "date-fns";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import ArticleIcon from "@mui/icons-material/Article";
import PollChip from "@/components/news/PollChip";
import { useActiveDateLocale } from "@/hooks/useActiveDateLocale";
import type { PostItem } from "@/components/news/LatestNewsHero";

const SIDE_TEASER_LEN = 70;

function stripHtml(html: string, len: number): string {
  const plain = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > len ? plain.slice(0, len).trimEnd() + "…" : plain;
}

interface SideCardProps {
  post: PostItem;
}

export default function SideCard({ post }: SideCardProps) {
  const dateLocale = useActiveDateLocale();
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
              <PollChip closesAt={post.poll.closesAt} />
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
              {format(new Date(post.publishedAt), "d MMM yyyy", { locale: dateLocale })}
            </Typography>
          )}
        </Box>
      </Box>
    </Link>
  );
}
