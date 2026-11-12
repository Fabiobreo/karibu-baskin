import { Box, ButtonBase, Typography } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { getLocale, getTranslations } from "next-intl/server";
import { drivePhotoUrl } from "@/lib/gallery/drive";
import type { HomeAlbum } from "@/lib/gallery/albums";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";

interface HomeAlbumRowProps {
  album: HomeAlbum;
}

/**
 * "Nuove foto" in home (UX-57): una riga sola con la copertina e il titolo
 * dell'ultimo album uscito. Mai una griglia: la home non è la gallery.
 */
export default async function HomeAlbumRow({ album }: HomeAlbumRowProps) {
  const [t, locale] = await Promise.all([getTranslations("albumStrip"), getLocale()]);
  const day = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Rome",
  }).format(new Date(album.date));

  return (
    <ButtonBase
      href={`/gallery/${album.slug}`}
      focusRipple
      sx={{
        display: "flex",
        width: "100%",
        alignItems: "center",
        justifyContent: "flex-start",
        textAlign: "left",
        gap: 2,
        p: 1.5,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: RADIUS.lg,
        bgcolor: "background.paper",
        transition: "border-color 0.15s",
        "&:hover": { borderColor: "primary.main" },
        // La freccia (unica icona diretta della riga) si accende con il bordo.
        "&:hover > .MuiSvgIcon-root": { color: "primary.main" },
        "&.Mui-focusVisible": {
          outline: "3px solid",
          outlineColor: "primary.main",
          outlineOffset: 2,
        },
      }}
    >
      <Box
        sx={{
          width: { xs: 72, sm: 96 },
          aspectRatio: "4 / 3",
          flexShrink: 0,
          borderRadius: RADIUS.md,
          overflow: "hidden",
          bgcolor: "action.hover",
        }}
      >
        {album.coverFileId && (
          <Box
            component="img"
            src={drivePhotoUrl(album.coverFileId, 240)}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            sx={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ display: "block", lineHeight: 1.4 }}
        >
          {t("homeEyebrow")}
        </Typography>
        <Typography
          variant="body1"
          component="span"
          sx={{ display: "block", fontWeight: FONT_WEIGHT.semibold, overflowWrap: "anywhere" }}
        >
          {album.title}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          component="span"
          sx={{ display: "block" }}
        >
          {t("homeMeta", { count: album.photoCount, day })}
        </Typography>
      </Box>
      <ArrowForwardIcon sx={{ color: "text.secondary" }} aria-hidden />
    </ButtonBase>
  );
}
