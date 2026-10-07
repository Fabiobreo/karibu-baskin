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
import InstagramIcon from "@mui/icons-material/Instagram";
import Image from "next/image";
import { onHover } from "@/lib/hoverStyles";
import { RADIUS } from "@/lib/radius";
import Lightbox from "./Lightbox";

const LIGHTBOX_LABELS = {
  close: "Chiudi",
  prev: "Immagine precedente",
  next: "Immagine successiva",
};

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

  const openPost = openIndex !== null ? posts[openIndex] : null;
  const multi = !!openPost && openPost.blobUrls.length > 1;

  function open(index: number) {
    setOpenIndex(index);
    setSlide(0);
  }
  function close() {
    setOpenIndex(null);
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
              alt={post.caption?.slice(0, 80) ?? "Foto Karibu Baskin"}
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
        labels={LIGHTBOX_LABELS}
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
                Apri su Instagram
              </Button>
            </Box>
          )
        }
      >
        {openPost && (
          <Image
            src={openPost.blobUrls[slide]}
            alt={openPost.caption?.slice(0, 80) ?? "Foto Karibu Baskin"}
            fill
            sizes="100vw"
            style={{ objectFit: "contain" }}
          />
        )}
      </Lightbox>
    </>
  );
}
