"use client";
import { useState } from "react";
import {
  Box,
  ImageList,
  ImageListItem,
  Typography,
  useMediaQuery,
  useTheme,
  Button,
} from "@mui/material";
import CollectionsIcon from "@mui/icons-material/Collections";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import PlayCircleFilledIcon from "@mui/icons-material/PlayCircleFilled";
import InstagramIcon from "@mui/icons-material/Instagram";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { onHover } from "@/lib/hoverStyles";
import { RADIUS } from "@/lib/radius";
import Lightbox from "./Lightbox";

/**
 * Lettore incorporato di Instagram per un post: il file del video non lo
 * copiamo (pesa e scade), lo riproduce Instagram. `/embed/` senza `captioned`
 * mostra solo il video, la didascalia sta già sotto il palco.
 */
export function instagramEmbedUrl(permalink: string): string {
  return `${permalink.split("?")[0].replace(/\/?$/, "/")}embed/`;
}

export interface GalleryPost {
  id: string;
  caption: string | null;
  mediaType: string; // IMAGE | VIDEO | CAROUSEL_ALBUM
  permalink: string;
  blobUrls: string[];
}

interface GalleryGridProps {
  posts: GalleryPost[];
}

export default function GalleryGrid({ posts }: GalleryGridProps) {
  const theme = useTheme();
  const isSm = useMediaQuery(theme.breakpoints.down("sm"));
  const isMd = useMediaQuery(theme.breakpoints.down("md"));
  const cols = isSm ? 2 : isMd ? 3 : 4;

  // Indice del post aperto nel lightbox (null = chiuso) e indice immagine nel carosello.
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [slide, setSlide] = useState(0);
  // Il lettore di Instagram si carica solo quando si preme Play: prima nessuna
  // richiesta (e nessun cookie) verso Instagram, come per i video YouTube.
  const [playing, setPlaying] = useState(false);
  const t = useTranslations("pages.gallery");

  const openPost = openIndex !== null ? posts[openIndex] : null;
  const multi = !!openPost && openPost.blobUrls.length > 1;
  const isVideo = openPost?.mediaType === "VIDEO";

  function open(index: number) {
    setOpenIndex(index);
    setSlide(0);
    setPlaying(false);
  }
  function close() {
    setOpenIndex(null);
    setPlaying(false);
  }
  function prevSlide() {
    if (!openPost) return;
    setSlide((s) => (s - 1 + openPost.blobUrls.length) % openPost.blobUrls.length);
  }
  function nextSlide() {
    if (!openPost) return;
    setSlide((s) => (s + 1) % openPost.blobUrls.length);
  }

  return (
    <>
      <ImageList cols={cols} gap={6} variant="standard" sx={{ m: 0, overflow: "hidden" }}>
        {posts.map((post, index) => (
          <ImageListItem
            key={post.id}
            onClick={() => open(index)}
            sx={{
              position: "relative",
              aspectRatio: "1 / 1",
              cursor: "pointer",
              borderRadius: RADIUS.md,
              overflow: "hidden",
              ...onHover({ "& img": { transform: "scale(1.04)" } }),
            }}
          >
            <Image
              src={post.blobUrls[0]}
              alt={post.caption?.slice(0, 80) ?? t("postAlt")}
              fill
              sizes="(max-width: 600px) 50vw, (max-width: 900px) 33vw, 25vw"
              style={{ objectFit: "cover", transition: "transform 0.25s ease" }}
            />
            {/* Badge tipo media */}
            {(post.mediaType === "CAROUSEL_ALBUM" || post.mediaType === "VIDEO") && (
              <Box
                sx={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  color: "common.white",
                  filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.6))",
                  display: "flex",
                }}
              >
                {post.mediaType === "VIDEO" ? (
                  <PlayCircleOutlineIcon fontSize="small" />
                ) : (
                  <CollectionsIcon fontSize="small" />
                )}
              </Box>
            )}
          </ImageListItem>
        ))}
      </ImageList>

      {/* Lightbox */}
      <Lightbox
        open={openPost !== null}
        onClose={close}
        onPrev={multi ? prevSlide : undefined}
        onNext={multi ? nextSlide : undefined}
        counter={openPost && multi ? `${slide + 1} / ${openPost.blobUrls.length}` : undefined}
        labels={{ close: t("close"), prev: t("prevPhoto"), next: t("nextPhoto") }}
        footer={
          openPost && (
            <Box sx={{ p: 2 }}>
              {openPost.caption && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ whiteSpace: "pre-line", mb: 2 }}
                >
                  {openPost.caption}
                </Typography>
              )}
              <Button
                component="a"
                href={openPost.permalink}
                target="_blank"
                rel="noopener noreferrer"
                startIcon={<InstagramIcon />}
                variant="outlined"
                size="small"
              >
                {t("openInstagram")}
              </Button>
            </Box>
          )
        }
      >
        {openPost && isVideo && playing ? (
          <Box
            component="iframe"
            src={instagramEmbedUrl(openPost.permalink)}
            title={t("videoTitle")}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            sx={{
              position: "absolute",
              inset: 0,
              m: "auto",
              width: "100%",
              maxWidth: 420,
              height: "100%",
              border: 0,
              bgcolor: "common.white",
            }}
          />
        ) : (
          openPost && (
            <>
              <Image
                src={openPost.blobUrls[slide]}
                alt={openPost.caption?.slice(0, 80) ?? t("postAlt")}
                fill
                sizes="100vw"
                style={{ objectFit: "contain" }}
              />
              {isVideo && (
                <Button
                  onClick={() => setPlaying(true)}
                  aria-label={t("playVideo")}
                  sx={{
                    position: "absolute",
                    inset: 0,
                    m: "auto",
                    width: 96,
                    height: 96,
                    borderRadius: "50%",
                    color: "common.white",
                    filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.6))",
                  }}
                >
                  <PlayCircleFilledIcon sx={{ fontSize: 80 }} />
                </Button>
              )}
            </>
          )
        )}
      </Lightbox>
    </>
  );
}
