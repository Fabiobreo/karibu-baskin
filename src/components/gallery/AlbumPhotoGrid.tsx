"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, ButtonBase } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { useTranslations } from "next-intl";
import { driveDownloadUrl, drivePhotoUrl } from "@/lib/gallery/drive";
import { albumPageHref, albumPageOfIndex } from "@/lib/gallery/albumPages";
import { RADIUS } from "@/lib/radius";
import Lightbox from "./Lightbox";

export interface AlbumGridPhoto {
  id: string;
  driveFileId: string;
  width: number;
  height: number;
}

interface AlbumPhotoGridProps {
  slug: string;
  title: string;
  /** Le foto della pagina che si sta guardando. */
  photos: AlbumGridPhoto[];
  /** Posizione nell'album (da 0) della prima foto della pagina. */
  offset: number;
  /** I file Drive di tutte le foto dell'album, in ordine: il lightbox le scorre tutte. */
  allFileIds: string[];
}

/** Larghezze chieste a Google: miniatura (e il doppio per gli schermi densi) e lightbox. */
const THUMB_WIDTH = 400;
const FULL_WIDTH = 1600;

/**
 * Griglia di un album da Drive (UX-52). Righe "giustificate": ogni foto tiene
 * le sue proporzioni e occupa in larghezza quanto serve a riempire la riga.
 * L'altezza di ogni cella viene da `aspect-ratio`, quindi la pagina ha già la
 * sua forma prima che arrivi una sola immagine (nessun salto di layout).
 *
 * `<img>` semplice e non `next/image`: le foto sono centinaia per album e
 * Google le dà già ridimensionate; passarle dall'ottimizzatore di Vercel
 * consumerebbe la quota senza guadagnare niente.
 *
 * La griglia mostra una pagina dell'album, il lightbox le scorre tutte: se ci
 * si ferma su una foto di un'altra pagina, alla chiusura la griglia si porta
 * su quella pagina e mette il fuoco sulla foto, così non si perde il punto.
 */
export default function AlbumPhotoGrid({
  slug,
  title,
  photos,
  offset,
  allFileIds,
}: AlbumPhotoGridProps) {
  const t = useTranslations("pages");
  const router = useRouter();
  // Posizione nell'album (non nella pagina) della foto aperta nel lightbox.
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  // Foto su cui riportare il fuoco quando arriva la pagina che la contiene.
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  // Finché il lightbox non è sparito del tutto la pagina dietro è bloccata, e
  // quando si sblocca il browser ne riaggiusta lo scorrimento: portarsi sulla
  // foto prima di allora non serve, si finisce altrove.
  const [lightboxGone, setLightboxGone] = useState(true);
  const listRef = useRef<HTMLUListElement>(null);
  const total = allFileIds.length;

  const prev = useCallback(
    () => setOpenIndex((i) => (i === null ? i : (i - 1 + total) % total)),
    [total]
  );
  const next = useCallback(() => setOpenIndex((i) => (i === null ? i : (i + 1) % total)), [total]);

  const openFileId = openIndex !== null ? allFileIds[openIndex] : null;

  function close() {
    const index = openIndex;
    setOpenIndex(null);
    if (index === null) return;
    const inPage = index >= offset && index < offset + photos.length;
    if (inPage) return;
    setFocusIndex(index);
    // Senza tornare in cima: la foto su cui ci si è fermati riceve il fuoco.
    router.push(albumPageHref(slug, albumPageOfIndex(index)), { scroll: false });
  }

  useEffect(() => {
    if (focusIndex === null || !lightboxGone) return;
    const button = listRef.current?.querySelector<HTMLElement>(`[data-index="${focusIndex}"]`);
    if (!button) return; // la pagina giusta non è ancora arrivata
    button.focus({ preventScroll: true });
    button.scrollIntoView({ block: "center" });
    setFocusIndex(null);
  }, [focusIndex, offset, lightboxGone]);
  const alt = (index: number) => t("gallery.photoAlt", { index: index + 1, total, title });

  return (
    <>
      <Box
        component="ul"
        ref={listRef}
        sx={{
          // Altezza indicativa di una riga: le foto si allargano per riempirla.
          "--row": { xs: "112px", sm: "168px", md: "208px" },
          listStyle: "none",
          m: 0,
          p: 0,
          display: "flex",
          flexWrap: "wrap",
          gap: 0.75,
          // L'ultima riga non si stira a tutta larghezza.
          "&::after": { content: '""', flexGrow: 1000 },
        }}
      >
        {photos.map((photo, i) => {
          const index = offset + i;
          const ratio = photo.width / photo.height;
          return (
            <Box
              component="li"
              key={photo.id}
              style={{ flexGrow: ratio, flexBasis: `calc(var(--row) * ${ratio.toFixed(4)})` }}
              sx={{ minWidth: 0 }}
            >
              <ButtonBase
                onClick={() => {
                  setLightboxGone(false);
                  setOpenIndex(index);
                }}
                data-index={index}
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
                  alt={alt(index)}
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

      <Lightbox
        fullScreen
        open={openFileId !== null}
        onClose={close}
        // Un fotogramma dopo: lo sblocco della pagina avviene alla fine dell'uscita.
        onExited={() => requestAnimationFrame(() => setLightboxGone(true))}
        onPrev={total > 1 ? prev : undefined}
        onNext={total > 1 ? next : undefined}
        counter={openIndex !== null ? `${openIndex + 1} / ${total}` : undefined}
        labels={{
          close: t("gallery.close"),
          prev: t("gallery.prevPhoto"),
          next: t("gallery.nextPhoto"),
        }}
        footer={
          openFileId && (
            <Box sx={{ display: "flex", justifyContent: "center", p: 1.5 }}>
              <Button
                // Google risponde con un allegato: il browser salva il file e
                // la pagina resta dov'è, quindi niente scheda nuova.
                href={driveDownloadUrl(openFileId)}
                download
                rel="noreferrer"
                referrerPolicy="no-referrer"
                variant="outlined"
                color="inherit"
                startIcon={<DownloadIcon />}
                sx={{ color: "common.white", minHeight: 44 }}
              >
                {t("gallery.downloadPhoto")}
              </Button>
            </Box>
          )
        }
      >
        {openFileId && openIndex !== null && (
          <Box
            component="img"
            // `key`: cambiando foto l'elemento si ricrea, e la precedente non
            // resta a schermo mentre la nuova si carica.
            key={openFileId}
            src={drivePhotoUrl(openFileId, FULL_WIDTH)}
            alt={alt(openIndex)}
            referrerPolicy="no-referrer"
            sx={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
          />
        )}
      </Lightbox>
    </>
  );
}
