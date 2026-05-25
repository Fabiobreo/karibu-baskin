"use client";
import { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Paper,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Divider,
  Tooltip,
  Alert,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PublishIcon from "@mui/icons-material/Publish";
import UnpublishedIcon from "@mui/icons-material/Unpublished";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import { useToast } from "@/context/ToastContext";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import dynamic from "next/dynamic";
import PollEditor, { type PollDraft } from "@/components/PollEditor";

const PostEditor = dynamic(() => import("@/components/PostEditor"), { ssr: false });

interface PostSummary {
  id: string;
  slug: string;
  title: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: { name: string | null };
  poll: { id: string; question: string; closesAt: string | null; multiSelect: boolean } | null;
}

interface AdminNewsClientProps {
  initialPosts: PostSummary[];
}

const EMPTY_POLL: PollDraft = {
  question: "",
  multiSelect: false,
  closesAt: null,
  options: [
    { text: "", order: 0 },
    { text: "", order: 1 },
  ],
};

export default function AdminNewsClient({ initialPosts }: AdminNewsClientProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [open, setOpen] = useState(false);
  const [editPost, setEditPost] = useState<PostSummary | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [publish, setPublish] = useState(false);
  const [hasPoll, setHasPoll] = useState(false);
  const [poll, setPoll] = useState<PollDraft>(EMPTY_POLL);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<PostSummary | null>(null);
  const { showToast } = useToast();

  function openNew() {
    setEditPost(null);
    setTitle("");
    setBody("");
    setPublish(false);
    setHasPoll(false);
    setPoll(EMPTY_POLL);
    setOpen(true);
  }

  function openEdit(post: PostSummary) {
    setEditPost(post);
    setTitle(post.title);
    setBody("");
    setPublish(!!post.publishedAt);
    if (post.poll) {
      setHasPoll(true);
      setPoll({
        question: post.poll.question,
        multiSelect: post.poll.multiSelect,
        closesAt: post.poll.closesAt ?? null,
        options: [
          { text: "", order: 0 },
          { text: "", order: 1 },
        ],
      });
    } else {
      setHasPoll(false);
      setPoll(EMPTY_POLL);
    }
    setOpen(true);
  }

  async function handleSave() {
    if (!title.trim()) {
      showToast({ message: "Il titolo è obbligatorio", severity: "warning" });
      return;
    }
    if (!body.trim() || body === "<p></p>") {
      showToast({ message: "Il contenuto è obbligatorio", severity: "warning" });
      return;
    }
    if (hasPoll) {
      if (!poll.question.trim()) {
        showToast({ message: "La domanda del sondaggio è obbligatoria", severity: "warning" });
        return;
      }
      if (poll.options.some((o) => !o.text.trim())) {
        showToast({ message: "Tutte le opzioni devono avere un testo", severity: "warning" });
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        title,
        body,
        publish,
        poll: hasPoll ? poll : null,
      };
      const url = editPost ? `/api/posts/${editPost.id}` : "/api/posts";
      const method = editPost ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editPost
            ? {
                ...payload,
                unpublish: editPost.publishedAt && !publish ? true : undefined,
              }
            : payload
        ),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Errore");
      const saved = await res.json();

      if (editPost) {
        setPosts((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
        showToast({ message: "Post aggiornato", severity: "success" });
      } else {
        setPosts((prev) => [saved, ...prev]);
        showToast({ message: publish ? "Post pubblicato" : "Bozza salvata", severity: "success" });
      }
      setOpen(false);
    } catch (err) {
      showToast({ message: err instanceof Error ? err.message : "Errore", severity: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePublish(post: PostSummary) {
    const willPublish = !post.publishedAt;
    const res = await fetch(`/api/posts/${post.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(willPublish ? { publish: true } : { unpublish: true }),
    });
    if (!res.ok) {
      showToast({ message: "Errore", severity: "error" });
      return;
    }
    const updated = await res.json();
    setPosts((prev) => prev.map((p) => (p.id === post.id ? updated : p)));
    showToast({
      message: willPublish ? "Post pubblicato" : "Post rimesso in bozza",
      severity: "success",
    });
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    const res = await fetch(`/api/posts/${confirmDelete.id}`, { method: "DELETE" });
    if (!res.ok) {
      showToast({ message: "Errore nell'eliminazione", severity: "error" });
      return;
    }
    setPosts((prev) => prev.filter((p) => p.id !== confirmDelete.id));
    showToast({ message: "Post eliminato", severity: "success" });
    setConfirmDelete(null);
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          News
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
          Nuovo post
        </Button>
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Titolo</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Stato</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Data</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Autore</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {posts.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} sx={{ textAlign: "center", color: "text.secondary", py: 4 }}>
                  Nessun post ancora
                </TableCell>
              </TableRow>
            )}
            {posts.map((post) => (
              <TableRow key={post.id} hover>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {post.title}
                    {post.poll && (
                      <Tooltip title="Ha un sondaggio allegato">
                        <HowToVoteIcon fontSize="small" color="primary" />
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={post.publishedAt ? "Pubblicato" : "Bozza"}
                    size="small"
                    color={post.publishedAt ? "success" : "default"}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {post.publishedAt
                      ? format(new Date(post.publishedAt), "d MMM yyyy", { locale: it })
                      : format(new Date(post.createdAt), "d MMM yyyy", { locale: it })}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption">{post.author.name ?? "—"}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title={post.publishedAt ? "Rimetti in bozza" : "Pubblica"}>
                    <IconButton size="small" onClick={() => handleTogglePublish(post)}>
                      {post.publishedAt ? (
                        <UnpublishedIcon fontSize="small" />
                      ) : (
                        <PublishIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Modifica">
                    <IconButton size="small" onClick={() => openEdit(post)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Elimina">
                    <IconButton size="small" color="error" onClick={() => setConfirmDelete(post)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog crea/modifica */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editPost ? "Modifica post" : "Nuovo post"}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 2 }}>
          <TextField
            label="Titolo"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            required
            inputProps={{ maxLength: 200 }}
          />

          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Contenuto
            </Typography>
            <PostEditor value={body} onChange={setBody} minHeight={180} />
          </Box>

          {editPost && (
            <Alert severity="info" sx={{ py: 0.5 }}>
              Per modificare il contenuto esistente, il testo apparirà vuoto — scrivi il nuovo
              contenuto completo nel box sopra.
            </Alert>
          )}

          <Divider />

          {/* Sezione sondaggio */}
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={hasPoll}
                  onChange={(e) => setHasPoll(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <HowToVoteIcon fontSize="small" />
                  <span>Aggiungi sondaggio</span>
                </Box>
              }
            />
            {hasPoll && (
              <Box sx={{ mt: 1.5, pl: 1 }}>
                <PollEditor value={poll} onChange={setPoll} />
              </Box>
            )}
          </Box>

          <Divider />

          <FormControlLabel
            control={
              <Switch
                checked={publish}
                onChange={(e) => setPublish(e.target.checked)}
                color="success"
              />
            }
            label={publish ? "Pubblicato" : "Bozza (non visibile al pubblico)"}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={saving}>
            Annulla
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? "Salvataggio..." : "Salva"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog conferma eliminazione */}
      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>Elimina post</DialogTitle>
        <DialogContent>
          <Typography>
            Sei sicuro di voler eliminare <strong>&quot;{confirmDelete?.title}&quot;</strong>?
            L&apos;azione è irreversibile.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Annulla</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            Elimina
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
