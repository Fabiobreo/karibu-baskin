"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  TablePagination,
  Paper,
  Chip,
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
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import AddIcon from "@mui/icons-material/Add";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import { useToast } from "@/context/ToastContext";
import { useRowsPerPage } from "@/hooks/useRowsPerPage";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import dynamic from "next/dynamic";
import PollEditor, { type PollDraft } from "@/components/news/PollEditor";
import ImageUploader from "@/components/common/ImageUploader";
import { readError } from "@/lib/fetchJson";
import { isoToLocalInput, localInputToIso } from "@/lib/datetimeLocal";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { visuallyHidden } from "@mui/utils";
import RowActions from "@/components/admin/RowActions";
import { newsMenuEntries } from "@/lib/adminRowActions";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";

const PostEditor = dynamic(() => import("@/components/news/PostEditor"), { ssr: false });

interface PostSummary {
  id: string;
  slug: string;
  title: string;
  imageUrl: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: { name: string | null };
  poll: { id: string; question: string; closesAt: string | null; multiSelect: boolean } | null;
}

interface AdminNewsClientProps {
  initialPosts: PostSummary[];
  /** Dirigente: legge i post, bozze comprese, senza crearli né modificarli. */
  readOnly?: boolean;
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

export default function AdminNewsClient({ initialPosts, readOnly = false }: AdminNewsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState(initialPosts);
  const [open, setOpen] = useState(false);
  const [editPost, setEditPost] = useState<PostSummary | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [publish, setPublish] = useState(false);
  const [hasPoll, setHasPoll] = useState(false);
  const [poll, setPoll] = useState<PollDraft>(EMPTY_POLL);
  const [saving, setSaving] = useState(false);
  // Dopo un'eliminazione il focus torna su "Nuovo post": la riga non c'è più.
  const newButtonRef = useRef<HTMLButtonElement>(null);
  const { showToast } = useToast();
  const { openConfirm, ConfirmDialog } = useConfirmDialog();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useRowsPerPage("news", [10, 25, 50], 10);
  const lastPage = Math.max(0, Math.ceil(posts.length / rowsPerPage) - 1);
  const safePage = Math.min(page, lastPage);
  const paginatedPosts = posts.slice(safePage * rowsPerPage, (safePage + 1) * rowsPerPage);

  function openNew() {
    setEditPost(null);
    setTitle("");
    setBody("");
    setImageUrl(null);
    setPublish(false);
    setHasPoll(false);
    setPoll(EMPTY_POLL);
    setOpen(true);
  }

  async function openEdit(post: PostSummary) {
    setEditPost(post);
    setTitle(post.title);
    setBody("");
    setImageUrl(post.imageUrl ?? null);
    setPublish(!!post.publishedAt);
    setHasPoll(!!post.poll);
    setPoll(EMPTY_POLL);
    setOpen(true);

    // Carica il contenuto completo (body + opzioni del sondaggio)
    try {
      const res = await fetch(`/api/posts/${post.id}`);
      if (!res.ok) throw new Error("Errore nel caricamento del post");
      const full = await res.json();
      setBody(full.body ?? "");
      setImageUrl(full.imageUrl ?? null);
      if (full.poll) {
        setHasPoll(true);
        setPoll({
          question: full.poll.question,
          multiSelect: full.poll.multiSelect,
          // L'input `datetime-local` non sa leggere un ISO con la Z: senza
          // questa conversione il campo restava vuoto in modifica.
          closesAt: isoToLocalInput(full.poll.closesAt),
          options:
            Array.isArray(full.poll.options) && full.poll.options.length >= 2
              ? full.poll.options.map((o: { text: string; order: number }, i: number) => ({
                  text: o.text,
                  order: typeof o.order === "number" ? o.order : i,
                }))
              : [
                  { text: "", order: 0 },
                  { text: "", order: 1 },
                ],
        });
      } else {
        setHasPoll(false);
        setPoll(EMPTY_POLL);
      }
    } catch (err) {
      showToast({
        message: err instanceof Error ? err.message : "Errore nel caricamento",
        severity: "error",
      });
    }
  }

  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId || readOnly) return;
    const post = initialPosts.find((p) => p.id === editId);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (post) openEdit(post);
    router.replace("/admin/news", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        imageUrl,
        publish,
        // Lo schema Zod vuole un ISO con offset; l'input ne produce uno senza
        // secondi ne' fuso, e la creazione falliva con "Invalid ISO datetime".
        poll: hasPoll ? { ...poll, closesAt: localInputToIso(poll.closesAt) } : null,
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
      if (!res.ok) throw new Error(await readError(res));
      const saved = await res.json();

      if (editPost) {
        setPosts((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
        showToast({ message: "Post aggiornato", severity: "success" });
      } else {
        setPosts((prev) => [saved, ...prev]);
        setPage(0);
        showToast({ message: publish ? "Post pubblicato" : "Bozza salvata", severity: "success" });
      }
      setOpen(false);
    } catch (err) {
      showToast({ message: err instanceof Error ? err.message : "Errore", severity: "error" });
    } finally {
      setSaving(false);
    }
  }

  /** Pubblicare manda una notifica a tutti e non si ritira: prima si chiede. */
  function askTogglePublish(post: PostSummary) {
    if (post.publishedAt) {
      void handleTogglePublish(post);
      return;
    }
    openConfirm(
      "Pubblicare il post?",
      `"${post.title}" diventa visibile a tutti e parte una notifica a tutti. La notifica non si può ritirare.`,
      () => void handleTogglePublish(post),
      { confirmLabel: "Pubblica e avvisa", confirmColor: "primary" }
    );
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

  async function handleDelete(post: PostSummary) {
    const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
    if (!res.ok) {
      showToast({ message: await readError(res), severity: "error" });
      return false;
    }
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
    showToast({ message: "Post eliminato", severity: "success" });
  }

  /** "Modifica" in riga; nel "⋯" pubblica o bozza, pagina pubblica (se uscita), elimina. */
  function postActions(post: PostSummary) {
    // Dirigente: di un post uscito apre la pagina, di una bozza legge solo la riga.
    if (readOnly) {
      return post.publishedAt ? (
        <RowActions
          subject={post.title}
          primary={{
            label: "Pagina pubblica",
            href: `/news/${post.slug}`,
            external: true,
            emphasis: "text",
          }}
        />
      ) : null;
    }
    return (
      <RowActions
        subject={post.title}
        primary={{ label: "Modifica", onClick: () => openEdit(post) }}
        items={newsMenuEntries(!!post.publishedAt).map((e) =>
          e.key === "public"
            ? { label: e.label, href: `/news/${post.slug}`, external: true }
            : { label: e.label, onClick: () => askTogglePublish(post) }
        )}
        onDelete={() => handleDelete(post)}
        deleteLabel="Elimina post…"
        deleteConfirm={{
          title: "Eliminare il post?",
          message: `Eliminare "${post.title}"${post.poll ? " e il suo sondaggio" : ""}? L'azione non si può annullare.`,
        }}
        focusAfterDelete={newButtonRef}
      />
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {!readOnly && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 3 }}>
          <Button ref={newButtonRef} variant="contained" startIcon={<AddIcon />} onClick={openNew}>
            Nuovo post
          </Button>
        </Box>
      )}

      {/* Desktop table */}
      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{ display: { xs: "none", sm: "block" }, overflowX: "auto" }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: FONT_WEIGHT.semibold }}>Titolo</TableCell>
              <TableCell sx={{ fontWeight: FONT_WEIGHT.semibold }}>Stato</TableCell>
              <TableCell
                sx={{ fontWeight: FONT_WEIGHT.semibold, display: { xs: "none", md: "table-cell" } }}
              >
                Data
              </TableCell>
              <TableCell
                sx={{ fontWeight: FONT_WEIGHT.semibold, display: { xs: "none", md: "table-cell" } }}
              >
                Autore
              </TableCell>
              <TableCell align="right">
                <Box component="span" sx={visuallyHidden}>
                  Azioni
                </Box>
              </TableCell>
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
            {paginatedPosts.map((post) => (
              <TableRow key={post.id} hover>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold}>
                      {post.title}
                    </Typography>
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
                    variant={post.publishedAt ? "filled" : "outlined"}
                  />
                </TableCell>
                <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                  <Typography variant="caption" color="text.secondary">
                    {post.publishedAt
                      ? format(new Date(post.publishedAt), "d MMM yyyy", { locale: it })
                      : format(new Date(post.createdAt), "d MMM yyyy", { locale: it })}
                  </Typography>
                </TableCell>
                <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                  <Typography variant="caption">{post.author.name ?? "—"}</Typography>
                </TableCell>
                <TableCell align="right">{postActions(post)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Mobile card view */}
      <Paper variant="outlined" sx={{ display: { xs: "block", sm: "none" } }}>
        {posts.length === 0 ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              Nessun post ancora
            </Typography>
          </Box>
        ) : (
          paginatedPosts.map((post) => (
            <Box
              key={post.id}
              sx={{
                px: 2,
                py: 1.5,
                borderBottom: "1px solid",
                borderColor: "divider",
                "&:last-child": { borderBottom: 0 },
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box sx={{ flex: 1, minWidth: 0, mr: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                    <Typography
                      variant="body2"
                      fontWeight={FONT_WEIGHT.semibold}
                      sx={{ wordBreak: "break-word" }}
                    >
                      {post.title}
                    </Typography>
                    {post.poll && (
                      <Tooltip title="Ha un sondaggio allegato">
                        <HowToVoteIcon sx={{ fontSize: 14 }} color="primary" />
                      </Tooltip>
                    )}
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
                    <Chip
                      label={post.publishedAt ? "Pubblicato" : "Bozza"}
                      size="small"
                      variant={post.publishedAt ? "filled" : "outlined"}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {post.publishedAt
                        ? format(new Date(post.publishedAt), "d MMM yyyy", { locale: it })
                        : format(new Date(post.createdAt), "d MMM yyyy", { locale: it })}
                    </Typography>
                  </Box>
                </Box>
                {postActions(post)}
              </Box>
            </Box>
          ))
        )}
      </Paper>

      {posts.length > 0 && (
        <TablePagination
          component="div"
          count={posts.length}
          page={safePage}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50]}
          labelRowsPerPage="Righe:"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} di ${count}`}
        />
      )}

      {/* Dialog crea/modifica */}
      <ResponsiveDialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editPost ? "Modifica post" : "Nuovo post"}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 4 }}>
          <TextField
            label="Titolo"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            required
            inputProps={{ maxLength: 200 }}
            sx={{ mt: 1.5 }}
          />

          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Immagine di copertina
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
              Facoltativa: mostrata come banner nella pagina news e nell&apos;anteprima in lista.
            </Typography>
            <ImageUploader
              currentUrl={imageUrl}
              folder="posts"
              onUploaded={setImageUrl}
              onRemoved={() => setImageUrl(null)}
              shape="square"
              size={140}
            />
          </Box>

          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Contenuto
            </Typography>
            <PostEditor value={body} onChange={setBody} minHeight={180} />
          </Box>

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
            control={<Switch checked={publish} onChange={(e) => setPublish(e.target.checked)} />}
            label={publish ? "Pubblicato" : "Bozza (non visibile al pubblico)"}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={saving}>
            Annulla
          </Button>
          <Button variant="contained" size="large" onClick={handleSave} disabled={saving}>
            {saving ? "Salvataggio..." : "Salva"}
          </Button>
        </DialogActions>
      </ResponsiveDialog>
      {ConfirmDialog}
    </Box>
  );
}
