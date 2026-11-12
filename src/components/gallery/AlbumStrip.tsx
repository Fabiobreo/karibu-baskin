import { Box, Button, ButtonBase, Typography } from "@mui/material";
import PhotoLibraryOutlinedIcon from "@mui/icons-material/PhotoLibraryOutlined";
import { getTranslations } from "next-intl/server";
import { drivePhotoUrl } from "@/lib/gallery/drive";
import type { LinkedAlbum } from "@/lib/gallery/albums";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import MembersOnlyNotice from "@/components/common/MembersOnlyNotice";

interface AlbumStripProps {
  albums: LinkedAlbum[];
  /** Di cosa sono le foto: decide la frase per chi non le può vedere. */
  of: "match" | "event";
  /** Chi non le vede: senza accesso o con l'account in attesa. */
  viewer: "anonymous" | "guest" | "member";
  /** Pagina a cui tornare dopo l'accesso. */
  returnTo: string;
}

/** Larghezza chiesta a Google per le miniature (e il doppio per gli schermi densi). */
const THUMB_WIDTH = 400;

/**
 * Fascia "Foto" su partita ed evento (UX-57): una riga di miniature per ogni
 * album collegato, con le proporzioni vere, e il bottone verso l'album. Senza
 * album sul sito la fascia non c'è.
 *
 * Toccando una miniatura si apre l'album con il lightbox su quella foto
 * (`/gallery/<slug>?foto=<id>`). Un album "Solo tesserati", a chi non lo è,
 * diventa una riga di testo: nessuna foto né titolo nel payload.
 *
 * `<img>` semplice con `referrerPolicy="no-referrer"`, come nella pagina
 * dell'album: Google serve le foto già ridimensionate.
 */
export default async function AlbumStrip({ albums, of, viewer, returnTo }: AlbumStripProps) {
  if (albums.length === 0) return null;
  const t = await getTranslations("albumStrip");
  const visible = albums.filter((a) => a.canSee);
  const hidden = albums.filter((a) => !a.canSee);
  const hiddenCount = hidden.reduce((n, a) => n + a.photoCount, 0);
  const showTitles = albums.length > 1;

  return (
    <Box component="section" aria-labelledby="album-strip-title">
      <Typography
        id="album-strip-title"
        variant="h4"
        component="h2"
        sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
      >
        <PhotoLibraryOutlinedIcon sx={{ color: "primary.main" }} aria-hidden />
        {t("title")}
      </Typography>

      <Box sx={{ display: "grid", gap: 3 }}>
        {visible.map((album) => (
          <Box key={album.id}>
            {showTitles && (
              <Typography
                variant="body1"
                component="h3"
                sx={{ fontWeight: FONT_WEIGHT.semibold, mb: 1, overflowWrap: "anywhere" }}
              >
                {album.title}
              </Typography>
            )}
            <Box
              component="ul"
              sx={{
                "--row": { xs: "120px", sm: "150px" },
                listStyle: "none",
                m: 0,
                p: 0,
                display: "flex",
                gap: 0.75,
                mb: 1.5,
              }}
            >
              {album.photos.map((photo, i) => {
                const ratio = photo.width / photo.height;
                return (
                  <Box
                    component="li"
                    key={photo.id}
                    style={{ flexGrow: ratio, flexBasis: `calc(var(--row) * ${ratio.toFixed(4)})` }}
                    // Sul telefono due miniature: la riga resta alta abbastanza da riconoscere i volti.
                    sx={{ minWidth: 0, display: { xs: i < 2 ? "block" : "none", sm: "block" } }}
                  >
                    <ButtonBase
                      href={`/gallery/${album.slug}?foto=${photo.id}`}
                      focusRipple
                      sx={{
                        display: "block",
                        width: "100%",
                        borderRadius: RADIUS.md,
                        overflow: "hidden",
                        bgcolor: "action.hover",
                        "&.Mui-focusVisible": {
                          outline: "3px solid",
                          outlineColor: "primary.main",
                          outlineOffset: 2,
                        },
                      }}
                    >
                      <Box
                        component="img"
                        src={drivePhotoUrl(photo.driveFileId, THUMB_WIDTH)}
                        srcSet={`${drivePhotoUrl(photo.driveFileId, THUMB_WIDTH)} 1x, ${drivePhotoUrl(photo.driveFileId, THUMB_WIDTH * 2)} 2x`}
                        alt={t("photoAlt", {
                          index: i + 1,
                          total: album.photoCount,
                          title: album.title,
                        })}
                        width={photo.width}
                        height={photo.height}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
                        sx={{ display: "block", width: "100%", height: "auto", objectFit: "cover" }}
                      />
                    </ButtonBase>
                  </Box>
                );
              })}
            </Box>
            <Button href={`/gallery/${album.slug}`} variant="outlined">
              {t("seeAll", { count: album.photoCount })}
            </Button>
          </Box>
        ))}

        {hidden.length > 0 && viewer !== "member" && (
          <Box>
            <Typography variant="body1" sx={{ mb: 0.5 }}>
              {t(of === "match" ? "hiddenMatch" : "hiddenEvent", { count: hiddenCount })}
            </Typography>
            <MembersOnlyNotice viewer={viewer} what="photosShort" returnTo={returnTo} />
          </Box>
        )}
      </Box>
    </Box>
  );
}
