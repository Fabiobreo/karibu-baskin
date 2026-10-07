import { Box, Link as MuiLink, Typography } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { drivePhotoUrl } from "@/lib/gallery/drive";
import { RADIUS } from "@/lib/radius";

export interface AlbumCardItem {
  slug: string;
  title: string;
  /** Data già formattata nella lingua di chi guarda. */
  dateLabel: string;
  /** "84 foto", già tradotto. */
  countLabel: string;
  coverFileId: string | null;
  /** Etichetta "Solo tesserati" (tradotta) per gli album riservati; null se pubblico. */
  membersLabel: string | null;
}

interface AlbumCardsProps {
  albums: AlbumCardItem[];
}

/**
 * Schede degli album in `/gallery` (UX-52): copertina, titolo, data e numero
 * di foto. Niente "use client" e niente `sx` a funzione: sta in un Server
 * Component.
 */
export default function AlbumCards({ albums }: AlbumCardsProps) {
  return (
    <Box
      component="ul"
      sx={{
        listStyle: "none",
        m: 0,
        p: 0,
        display: "grid",
        gap: 2,
        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
      }}
    >
      {albums.map((album) => (
        <Box component="li" key={album.slug} sx={{ minWidth: 0 }}>
          <MuiLink
            href={`/gallery/${album.slug}`}
            underline="none"
            color="inherit"
            sx={{
              display: "block",
              height: "100%",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: RADIUS.lg,
              overflow: "hidden",
              bgcolor: "background.paper",
              "& [data-arrow]": { color: "text.secondary" },
              "&:hover": { borderColor: "primary.main" },
              "&:hover [data-arrow]": { color: "primary.main" },
            }}
          >
            <Box sx={{ aspectRatio: "3 / 2", bgcolor: "action.hover" }}>
              {album.coverFileId && (
                <Box
                  component="img"
                  src={drivePhotoUrl(album.coverFileId, 640)}
                  // Decorativa: il nome dell'album è il titolo qui sotto.
                  alt=""
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  sx={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
                />
              )}
            </Box>
            <Box sx={{ p: 2, display: "flex", alignItems: "flex-start", gap: 1 }}>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="h6" component="h3" sx={{ overflowWrap: "anywhere" }}>
                  {album.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {album.dateLabel} · {album.countLabel}
                </Typography>
                {album.membersLabel && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}
                  >
                    <LockOutlinedIcon sx={{ fontSize: "inherit" }} aria-hidden />
                    {album.membersLabel}
                  </Typography>
                )}
              </Box>
              <ArrowForwardIcon data-arrow fontSize="small" aria-hidden />
            </Box>
          </MuiLink>
        </Box>
      ))}
    </Box>
  );
}
