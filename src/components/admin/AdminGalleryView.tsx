"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Box, Button, Tab, Tabs } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import PageHeader, { type BreadcrumbItem } from "@/components/common/PageHeader";
import AdminGalleryClient from "@/components/admin/AdminGalleryClient";
import AdminAlbumList from "@/components/admin/AdminAlbumList";
import AlbumFormDialog, { type AlbumLinkOption } from "@/components/admin/AlbumFormDialog";
import AlbumPhotosDialog from "@/components/admin/AlbumPhotosDialog";
import { useToast } from "@/context/ToastContext";
import { readError } from "@/lib/fetchJson";
import type { AlbumCard } from "@/lib/gallery/albums";

type GallerySection = "album" | "instagram";

interface AdminGalleryViewProps {
  header: { title: string; subtitle: string; breadcrumb: BreadcrumbItem[] };
  initialAlbums: AlbumCard[];
  linkOptions: AlbumLinkOption[];
  driveConfigured: boolean;
  instagram: React.ComponentProps<typeof AdminGalleryClient>;
}

/**
 * `/admin/gallery`: gli album da cartelle Drive (UX-52) e, nella seconda
 * scheda, il feed Instagram di prima.
 */
export default function AdminGalleryView({
  header,
  initialAlbums,
  linkOptions,
  driveConfigured,
  instagram,
}: AdminGalleryViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const titleRef = useRef<HTMLHeadingElement>(null);

  const [section, setSection] = useState<GallerySection>("album");
  const [albums, setAlbums] = useState(initialAlbums);
  // `undefined` = dialog chiuso, `null` = nuovo album.
  const [formAlbum, setFormAlbum] = useState<AlbumCard | null | undefined>(undefined);
  const [photosAlbum, setPhotosAlbum] = useState<AlbumCard | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // `?album=<id>` (da "Gestisci" sulla pagina pubblica) apre la modifica.
  useEffect(() => {
    const id = searchParams.get("album");
    if (!id) return;
    const album = initialAlbums.find((a) => a.id === id);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (album) setFormAlbum(album);
    router.replace(pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const replaceAlbum = (next: AlbumCard) =>
    setAlbums((prev) => prev.map((a) => (a.id === next.id ? next : a)));

  async function sync(album: AlbumCard) {
    setSyncingId(album.id);
    try {
      const res = await fetch(`/api/albums/${album.id}/sync`, { method: "POST" });
      if (!res.ok) throw new Error(await readError(res));
      const data: {
        result: { ok: true; added: number; removed: number } | { ok: false };
        album: AlbumCard | null;
      } = await res.json();
      if (data.album) replaceAlbum(data.album);
      if (data.result.ok) {
        const { added, removed } = data.result;
        showToast({
          message:
            added || removed
              ? `Aggiornato: ${added} foto nuove, ${removed} tolte.`
              : "Nessuna novità nella cartella.",
          severity: "success",
        });
      } else {
        showToast({
          message:
            "La cartella non risponde più: l'album non è sul sito finché la condivisione non torna.",
          severity: "warning",
          duration: 8000,
        });
      }
    } catch (err) {
      showToast({
        message: err instanceof Error ? err.message : "Aggiornamento non riuscito",
        severity: "error",
      });
    } finally {
      setSyncingId(null);
    }
  }

  async function remove(album: AlbumCard): Promise<boolean> {
    try {
      const res = await fetch(`/api/albums/${album.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await readError(res));
      setAlbums((prev) => prev.filter((a) => a.id !== album.id));
      showToast({ message: "Album eliminato", severity: "success" });
      return true;
    } catch (err) {
      showToast({
        message: err instanceof Error ? err.message : "Eliminazione non riuscita",
        severity: "error",
      });
      return false;
    }
  }

  return (
    <Box>
      <PageHeader
        {...header}
        titleRef={titleRef}
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setSection("album");
              setFormAlbum(null);
            }}
          >
            Nuovo album
          </Button>
        }
      />
      <Box sx={{ mb: 3, borderBottom: "1px solid", borderColor: "divider" }}>
        <Tabs
          value={section}
          onChange={(_, value: GallerySection) => setSection(value)}
          variant="scrollable"
          scrollButtons={false}
          aria-label="Sezioni della Gallery"
          sx={{ "& .MuiTab-root": { minHeight: 48 } }}
        >
          <Tab value="album" label={`Album (${albums.length})`} />
          <Tab value="instagram" label="Instagram" />
        </Tabs>
      </Box>

      {section === "album" ? (
        <AdminAlbumList
          albums={albums}
          syncingId={syncingId}
          onSync={sync}
          onEdit={setFormAlbum}
          onPhotos={setPhotosAlbum}
          onDelete={remove}
          focusAfterDelete={titleRef}
        />
      ) : (
        <AdminGalleryClient {...instagram} />
      )}

      {formAlbum !== undefined && (
        <AlbumFormDialog
          // Rimontato a ogni apertura: lo stato del modulo parte dall'album scelto.
          key={formAlbum?.id ?? "new"}
          open
          album={formAlbum}
          linkOptions={linkOptions}
          driveConfigured={driveConfigured}
          onClose={() => setFormAlbum(undefined)}
          onSaved={(saved, created) => {
            setAlbums((prev) =>
              created ? [saved, ...prev] : prev.map((a) => (a.id === saved.id ? saved : a))
            );
            setFormAlbum(undefined);
          }}
        />
      )}

      {photosAlbum && (
        <AlbumPhotosDialog
          album={photosAlbum}
          onClose={() => setPhotosAlbum(null)}
          onChanged={(patch) =>
            setAlbums((prev) => prev.map((a) => (a.id === photosAlbum.id ? { ...a, ...patch } : a)))
          }
        />
      )}
    </Box>
  );
}
