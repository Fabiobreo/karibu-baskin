"use client";
import { useState } from "react";
import {
  Box,
  Button,
  Typography,
  Alert,
  Grid2 as Grid,
  Paper,
  Switch,
  IconButton,
  Chip,
  CircularProgress,
} from "@mui/material";
import SyncIcon from "@mui/icons-material/Sync";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CollectionsIcon from "@mui/icons-material/Collections";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import Image from "next/image";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useToast } from "@/context/ToastContext";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import EmptyState from "@/components/common/EmptyState";
import { readError } from "@/lib/fetchJson";

interface GalleryAdminPost {
  id: string;
  caption: string | null;
  mediaType: string;
  permalink: string;
  blobUrls: string[];
  hidden: boolean;
  timestamp: string;
}

interface AdminGalleryClientProps {
  initialPosts: GalleryAdminPost[];
  instagramConfigured: boolean;
  youtubeConfigured: boolean;
}

export default function AdminGalleryClient({
  initialPosts,
  instagramConfigured,
  youtubeConfigured,
}: AdminGalleryClientProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [syncing, setSyncing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { showToast } = useToast();
  const { openConfirm, ConfirmDialog } = useConfirmDialog();

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/gallery/sync", { method: "POST" });
      if (!res.ok) throw new Error(await readError(res));
      const data = await res.json();
      showToast({
        message: `Sync completato: ${data.created} nuovi, ${data.updated} aggiornati, ${data.pruned} rimossi.`,
        severity: "success",
        duration: 6000,
      });
      // Ricarico la pagina per mostrare i nuovi post (server-side fetch).
      window.location.reload();
    } catch (err) {
      showToast({
        message: err instanceof Error ? err.message : "Errore durante il sync",
        severity: "error",
        duration: 6000,
      });
    } finally {
      setSyncing(false);
    }
  }

  async function toggleHidden(post: GalleryAdminPost) {
    setBusyId(post.id);
    const next = !post.hidden;
    try {
      const res = await fetch(`/api/gallery/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidden: next }),
      });
      if (!res.ok) throw new Error(await readError(res));
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, hidden: next } : p)));
      showToast({ message: next ? "Post nascosto" : "Post visibile", severity: "success" });
    } catch (err) {
      showToast({ message: err instanceof Error ? err.message : "Errore", severity: "error" });
    } finally {
      setBusyId(null);
    }
  }

  function confirmDelete(post: GalleryAdminPost) {
    openConfirm(
      "Eliminare questo post?",
      "Le immagini verranno rimosse definitivamente dalla Gallery. Il post resta su Instagram.",
      () => doDelete(post)
    );
  }

  async function doDelete(post: GalleryAdminPost) {
    setBusyId(post.id);
    try {
      const res = await fetch(`/api/gallery/${post.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await readError(res));
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      showToast({ message: "Post eliminato", severity: "success" });
    } catch (err) {
      showToast({ message: err instanceof Error ? err.message : "Errore", severity: "error" });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Box>
      {/* Stato configurazione */}
      {!instagramConfigured && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Instagram non è ancora configurato. Imposta le variabili d&apos;ambiente{" "}
          <code>IG_ACCESS_TOKEN</code> e <code>IG_BUSINESS_ACCOUNT_ID</code> per abilitare il feed.
        </Alert>
      )}
      {!youtubeConfigured && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Sezione video YouTube non configurata: imposta <code>YOUTUBE_CHANNEL_ID</code> per
          mostrare i video nella pagina pubblica.
        </Alert>
      )}

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="body2" color="text.secondary">
          {posts.length} post sincronizzati da Instagram
        </Typography>
        <Button
          variant="contained"
          startIcon={syncing ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
          onClick={handleSync}
          disabled={syncing || !instagramConfigured}
        >
          {syncing ? "Sincronizzo…" : "Sincronizza da Instagram"}
        </Button>
      </Box>

      {posts.length === 0 ? (
        <EmptyState
          icon={<CollectionsIcon sx={{ fontSize: 56, color: "text.disabled" }} />}
          title="Nessun post in Gallery"
          message={
            instagramConfigured
              ? "Premi “Sincronizza da Instagram” per importare gli ultimi post."
              : "Configura Instagram per iniziare a importare i post."
          }
        />
      ) : (
        <Grid container spacing={2}>
          {posts.map((post) => (
            <Grid key={post.id} size={{ xs: 6, sm: 4, md: 3 }}>
              <Paper
                elevation={0}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  overflow: "hidden",
                  opacity: post.hidden ? 0.55 : 1,
                }}
              >
                <Box sx={{ position: "relative", aspectRatio: "1 / 1", bgcolor: "action.hover" }}>
                  <Image
                    src={post.blobUrls[0]}
                    alt={post.caption?.slice(0, 60) ?? "Post Instagram"}
                    fill
                    sizes="(max-width: 600px) 50vw, 25vw"
                    style={{ objectFit: "cover" }}
                  />
                  {(post.mediaType === "CAROUSEL_ALBUM" || post.mediaType === "VIDEO") && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: 6,
                        right: 6,
                        color: "common.white",
                        filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.6))",
                      }}
                    >
                      {post.mediaType === "VIDEO" ? (
                        <PlayCircleOutlineIcon fontSize="small" />
                      ) : (
                        <CollectionsIcon fontSize="small" />
                      )}
                    </Box>
                  )}
                </Box>
                <Box sx={{ p: 1 }}>
                  <Typography variant="caption" color="text.disabled" sx={{ display: "block" }}>
                    {format(new Date(post.timestamp), "d MMM yyyy", { locale: it })}
                  </Typography>
                  <Box
                    sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                  >
                    <Chip
                      size="small"
                      label={post.hidden ? "Nascosto" : "Visibile"}
                      color={post.hidden ? "default" : "success"}
                      variant="outlined"
                      sx={{ height: 22 }}
                    />
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Switch
                        size="small"
                        checked={!post.hidden}
                        disabled={busyId === post.id}
                        onChange={() => toggleHidden(post)}
                        inputProps={{ "aria-label": "Mostra/nascondi post" }}
                      />
                      <IconButton
                        size="small"
                        color="error"
                        disabled={busyId === post.id}
                        onClick={() => confirmDelete(post)}
                        aria-label="Elimina post"
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {ConfirmDialog}
    </Box>
  );
}
