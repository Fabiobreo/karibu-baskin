"use client";

import Link from "next/link";
import { Box, Typography, Chip, Stack } from "@mui/material";
import { format } from "date-fns";
import type { Locale } from "date-fns";
import ArticleIcon from "@mui/icons-material/Article";
import PollChip from "@/components/news/PollChip";
import type { PostItem } from "@/components/news/LatestNewsHero";

const FEATURED_TEASER_LEN = 160;

function stripHtml(html: string, len: number): string {
  const plain = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > len ? plain.slice(0, len).trimEnd() + "…" : plain;
}

interface FeaturedCardProps {
  post: PostItem;
  dateLocale: Locale;
  featuredLabel: string;
}

export default function FeaturedCard({ post, dateLocale, featuredLabel }: FeaturedCardProps) {
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
              icon={<ArticleIcon sx={{ fontSize: 16 }} />}
              label={featuredLabel}
              size="small"
              sx={{
                bgcolor: "primary.main",
                color: "#fff",
                fontWeight: 700,
                "& .MuiChip-icon": { color: "#fff" },
              }}
            />
            {post.poll && <PollChip closesAt={post.poll.closesAt} />}
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
              {format(new Date(post.publishedAt), "d MMMM yyyy", { locale: dateLocale })}
            </Typography>
          )}
        </Box>
      </Box>
    </Link>
  );
}
