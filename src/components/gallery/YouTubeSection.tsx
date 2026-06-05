"use client";
import { useState } from "react";
import { Box, Typography, Grid2 as Grid } from "@mui/material";
import PlayCircleFilledIcon from "@mui/icons-material/PlayCircleFilled";
import Image from "next/image";

export interface GalleryVideo {
  id: string;
  title: string;
  thumbnail: string;
}

interface YouTubeSectionProps {
  videos: GalleryVideo[];
}

export default function YouTubeSection({ videos }: YouTubeSectionProps) {
  // L'iframe parte solo dopo click esplicito (click-to-load): nessun cookie
  // di YouTube viene impostato finché l'utente non avvia il video.
  const [active, setActive] = useState<Set<string>>(new Set());

  if (videos.length === 0) return null;

  return (
    <Box>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 0.5 }}>
        Video
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Dal nostro canale YouTube. Clicca per riprodurre.
      </Typography>

      <Grid container spacing={2}>
        {videos.map((video) => {
          const isActive = active.has(video.id);
          return (
            <Grid key={video.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Box
                sx={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "16 / 9",
                  borderRadius: 1.5,
                  overflow: "hidden",
                  bgcolor: "common.black",
                  cursor: isActive ? "default" : "pointer",
                }}
                onClick={() => {
                  if (isActive) return;
                  setActive((prev) => new Set(prev).add(video.id));
                }}
              >
                {isActive ? (
                  <Box
                    component="iframe"
                    src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`}
                    title={video.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    sx={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      border: 0,
                    }}
                  />
                ) : (
                  <>
                    <Image
                      src={video.thumbnail}
                      alt={video.title}
                      fill
                      sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw"
                      style={{ objectFit: "cover" }}
                    />
                    <Box
                      sx={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: "rgba(0,0,0,0.25)",
                        transition: "background-color 0.2s",
                        "&:hover": { bgcolor: "rgba(0,0,0,0.4)" },
                      }}
                    >
                      <PlayCircleFilledIcon sx={{ fontSize: 56, color: "common.white" }} />
                    </Box>
                  </>
                )}
              </Box>
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{
                  mt: 1,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {video.title}
              </Typography>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
