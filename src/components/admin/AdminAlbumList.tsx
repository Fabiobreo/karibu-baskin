"use client";
import type { RefObject } from "react";
import { Box, Paper, Typography } from "@mui/material";
import CollectionsIcon from "@mui/icons-material/Collections";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import EmptyState from "@/components/common/EmptyState";
import RowActions from "@/components/admin/RowActions";
import { driveFolderUrl, drivePhotoUrl } from "@/lib/gallery/drive";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { RADIUS } from "@/lib/radius";
import type { AlbumCard } from "@/lib/gallery/albums";

interface AdminAlbumListProps {
  albums: AlbumCard[];
  /** Id dell'album che si sta aggiornando da Drive. */
  syncingId: string | null;
  onSync: (album: AlbumCard) => void;
  onEdit: (album: AlbumCard) => void;
  onPhotos: (album: AlbumCard) => void;
  onDelete: (album: AlbumCard) => Promise<boolean>;
  focusAfterDelete: RefObject<HTMLElement | null>;
}

const VISIBILITY_LABEL: Record<AlbumCard["visibility"], string> = {
  MEMBERS: "Solo tesserati",
  PUBLIC: "Pubblico",
};

const day = (iso: string) => format(new Date(iso), "d MMM yyyy", { locale: it });

/** Elenco degli album da Drive in `/admin/gallery` (UX-52). */
export default function AdminAlbumList({
  albums,
  syncingId,
  onSync,
  onEdit,
  onPhotos,
  onDelete,
  focusAfterDelete,
}: AdminAlbumListProps) {
  if (albums.length === 0) {
    return (
      <EmptyState
        icon={<CollectionsIcon sx={{ fontSize: 56, color: "text.secondary" }} />}
        title="Nessun album"
        message="Con “Nuovo album” incolli il link di una cartella Google Drive e le sue foto compaiono nella Gallery, senza caricarle."
      />
    );
  }

  return (
    <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 1.5 }}>
      {albums.map((album) => {
        const hidden = album.totalPhotos - album.photoCount;
        const syncing = syncingId === album.id;
        return (
          <Paper
            component="li"
            key={album.id}
            elevation={0}
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: RADIUS.lg,
              p: 1.5,
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              flexWrap: { xs: "wrap", sm: "nowrap" },
            }}
          >
            <Box
              sx={{
                width: 72,
                height: 54,
                flexShrink: 0,
                borderRadius: RADIUS.md,
                overflow: "hidden",
                bgcolor: "action.hover",
              }}
            >
              {album.coverFileId && (
                <Box
                  component="img"
                  src={drivePhotoUrl(album.coverFileId, 200)}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  sx={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
                />
              )}
            </Box>

            <Box sx={{ minWidth: 0, flex: "1 1 200px" }}>
              <Typography
                variant="body1"
                sx={{ fontWeight: FONT_WEIGHT.semibold, overflowWrap: "anywhere" }}
              >
                {album.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {day(album.date)} · {album.photoCount} foto
                {hidden > 0 && ` (${hidden} ${hidden === 1 ? "nascosta" : "nascoste"})`} ·{" "}
                {VISIBILITY_LABEL[album.visibility]}
              </Typography>
              {album.unreachableAt ? (
                <Typography
                  variant="body2"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    fontWeight: FONT_WEIGHT.semibold,
                  }}
                >
                  <ErrorOutlineIcon fontSize="small" aria-hidden />
                  Non raggiungibile: non è sul sito. Controlla la condivisione su Drive, poi
                  “Aggiorna”.
                </Typography>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Aggiornato il {day(album.syncedAt)}
                </Typography>
              )}
            </Box>

            <Box sx={{ ml: "auto" }}>
              <RowActions
                subject={album.title}
                primary={{
                  label: syncing ? "Aggiorno…" : "Aggiorna",
                  onClick: () => !syncing && onSync(album),
                }}
                items={[
                  { label: "Modifica", onClick: () => onEdit(album) },
                  { label: "Foto", onClick: () => onPhotos(album) },
                  { label: "Apri sul sito", href: `/gallery/${album.slug}`, external: true },
                  {
                    label: "Apri su Drive",
                    href: driveFolderUrl(album.driveFolderId),
                    external: true,
                  },
                ]}
                onDelete={() => onDelete(album)}
                deleteLabel="Elimina album…"
                deleteConfirm={{
                  title: "Eliminare l'album?",
                  message: `“${album.title}” sparisce dal sito. Le foto su Drive non vengono toccate.`,
                }}
                focusAfterDelete={focusAfterDelete}
              />
            </Box>
          </Paper>
        );
      })}
    </Box>
  );
}
