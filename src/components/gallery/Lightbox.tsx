"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { Box, Dialog, IconButton } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { SxProps, Theme } from "@mui/material/styles";
import type { SystemStyleObject } from "@mui/system";
import CloseIcon from "@mui/icons-material/Close";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { RADIUS } from "@/lib/radius";
import { TOUCH_TARGET } from "@/lib/touchTarget";

interface LightboxProps {
  open: boolean;
  onClose: () => void;
  /** Il lightbox è sparito del tutto (fine dell'animazione, pagina di nuovo scorrevole). */
  onExited?: () => void;
  /** Senza, niente frecce (una sola immagine). */
  onPrev?: () => void;
  onNext?: () => void;
  /** "3 / 84", sopra l'immagine in basso. */
  counter?: string;
  labels: { close: string; prev: string; next: string };
  /** Tutto lo schermo (album) invece di un dialog (post Instagram). */
  fullScreen?: boolean;
  /** L'immagine: riempie il palco nero (`position: relative`). */
  children: ReactNode;
  /** Didascalia e azioni sotto il palco. */
  footer?: ReactNode;
}

/** Bottoni sopra una foto: bianchi su un velo scuro, in tutti e due i temi. */
function overlayButtonSx(position: SystemStyleObject<Theme>): SxProps<Theme> {
  return [
    TOUCH_TARGET,
    {
      position: "absolute",
      color: "common.white",
      bgcolor: (theme) => alpha(theme.palette.common.black, 0.45),
      "&:hover": { bgcolor: (theme) => alpha(theme.palette.common.black, 0.65) },
    },
    position,
  ];
}

/** Sotto questa distanza un tocco che si sposta non è uno swipe. */
const SWIPE_MIN = 48;

/**
 * Cornice del lightbox della Gallery: palco nero, chiudi, frecce, contatore,
 * frecce della tastiera e swipe. La usano i post Instagram (`GalleryGrid`) e
 * gli album da Drive (`AlbumPhotoGrid`); cosa mostrare lo decide chi la usa.
 */
export default function Lightbox({
  open,
  onClose,
  onExited,
  onPrev,
  onNext,
  counter,
  labels,
  fullScreen = false,
  children,
  footer,
}: LightboxProps) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") onPrev?.();
      if (e.key === "ArrowRight") onNext?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onPrev, onNext]);

  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    // Solo gesti orizzontali: uno scorrimento in verticale non cambia foto.
    if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy)) return;
    if (dx > 0) onPrev?.();
    else onNext?.();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={fullScreen}
      TransitionProps={{ onExited }}
      PaperProps={{
        sx: {
          bgcolor: fullScreen ? "common.black" : "background.default",
          backgroundImage: "none",
          ...(fullScreen && { display: "flex", flexDirection: "column" }),
        },
      }}
    >
      <Box
        sx={{
          position: "relative",
          ...(fullScreen && { flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }),
        }}
      >
        <IconButton
          onClick={onClose}
          aria-label={labels.close}
          sx={overlayButtonSx({ top: 8, right: 8, zIndex: 3 })}
        >
          <CloseIcon />
        </IconButton>

        <Box
          onTouchStart={(e) => {
            const touch = e.touches[0];
            touchStart.current = { x: touch.clientX, y: touch.clientY };
          }}
          onTouchEnd={onTouchEnd}
          sx={{
            position: "relative",
            width: "100%",
            bgcolor: "common.black",
            ...(fullScreen ? { flex: 1, minHeight: 0 } : { height: { xs: "60vh", md: "70vh" } }),
          }}
        >
          {children}

          {onPrev && (
            <IconButton
              onClick={onPrev}
              aria-label={labels.prev}
              sx={overlayButtonSx({ top: "50%", left: 8, transform: "translateY(-50%)" })}
            >
              <ChevronLeftIcon />
            </IconButton>
          )}
          {onNext && (
            <IconButton
              onClick={onNext}
              aria-label={labels.next}
              sx={overlayButtonSx({ top: "50%", right: 8, transform: "translateY(-50%)" })}
            >
              <ChevronRightIcon />
            </IconButton>
          )}
          {counter && (
            <Box
              aria-live="polite"
              sx={{
                position: "absolute",
                bottom: 10,
                left: "50%",
                transform: "translateX(-50%)",
                px: 1,
                py: 0.25,
                borderRadius: RADIUS.pill,
                bgcolor: (theme) => alpha(theme.palette.common.black, 0.55),
                color: "common.white",
                typography: "caption",
              }}
            >
              {counter}
            </Box>
          )}
        </Box>

        {footer}
      </Box>
    </Dialog>
  );
}
