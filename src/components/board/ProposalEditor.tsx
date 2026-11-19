"use client";
import { useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Paper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import { useTranslations } from "next-intl";
import { useToast } from "@/context/ToastContext";
import { categoryPath } from "@/lib/board/category";
import type { MyProposal } from "@/lib/board/loadProposals";
import { RADIUS } from "@/lib/radius";
import { TOUCH_TARGET_SIZE } from "@/lib/touchTarget";
import DeviceDraftAlert from "./DeviceDraftAlert";
import DrillCanvasEditor from "./DrillCanvasEditor";
import DrillPreviewDialog from "./DrillPreviewDialog";
import { drillHistoryReducer } from "./drillHistory";
import { proposalError } from "./proposalErrors";
import { clearDeviceDraft, useDeviceDraft } from "./useDeviceDraft";

const MAX_DESCRIPTION = 600;
const draftKey = (id: string) => `karibu-proposta:${id}`;

type Kind = "EXERCISE" | "WARMUP";
interface Fields {
  title: string;
  kind: Kind;
  description: string;
  showAuthor: boolean;
}

interface ProposalEditorProps {
  proposal: MyProposal;
  /** Nome di battesimo di chi propone, per "Idea di …". */
  firstName: string | null;
}

/**
 * Editor delle proposte dei tesserati (UX-73): lo stesso disegno dello staff
 * (`DrillCanvasEditor`), senza squadra, durata, visibilita' e pubblicazione,
 * solo esercizi. Si salva quando si vuole (bozza), poi "Invia allo staff";
 * finche' lo staff non la prende si modifica o si ritira. Le modifiche non
 * salvate restano sul dispositivo.
 */
export default function ProposalEditor({ proposal, firstName }: ProposalEditorProps) {
  const t = useTranslations("board");
  const tp = useTranslations("board.proposal");
  const router = useRouter();
  const { showToast } = useToast();
  const [history, dispatch] = useReducer(drillHistoryReducer, {
    content: proposal.content,
    past: [],
    future: [],
  });
  const initialFields: Fields = {
    title: proposal.title,
    kind: proposal.kind === "WARMUP" ? "WARMUP" : "EXERCISE",
    description: proposal.description ?? "",
    showAuthor: proposal.showAuthor,
  };
  const [fields, setFields] = useState<Fields>(initialFields);
  const [savedFields, setSavedFields] = useState<Fields>(initialFields);
  const [saved, setSaved] = useState(proposal.content);
  const [preview, setPreview] = useState(false);
  const [confirm, setConfirm] = useState<"submit" | "withdraw" | null>(null);
  const { content } = history;
  const key = draftKey(proposal.id);
  const contentDirty = content !== saved;
  const fieldsDirty = JSON.stringify(fields) !== JSON.stringify(savedFields);
  const dirty = contentDirty || fieldsDirty;
  const isDraft = proposal.state === "draft";
  const device = useDeviceDraft({
    key,
    base: proposal.updatedAt,
    content,
    saved,
    editedHere: history.past.length > 0 || contentDirty,
  });
  const set = <K extends keyof Fields>(k: K, v: Fields[K]) => setFields((f) => ({ ...f, [k]: v }));

  async function put() {
    const res = await fetch(`/api/drills/proposals/${proposal.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...fields, content }),
    });
    if (!res.ok) throw new Error(await proposalError(res, tp));
    setSaved(content);
    setSavedFields(fields);
    clearDeviceDraft(key);
  }

  const save = useMutation({
    mutationFn: put,
    onSuccess: () => {
      showToast({ message: tp("savedToast"), severity: "success" });
      router.refresh();
    },
    onError: (err) => showToast({ message: err.message, severity: "error" }),
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (dirty) await put();
      const res = await fetch(`/api/drills/proposals/${proposal.id}/submit`, { method: "POST" });
      if (!res.ok) throw new Error(await proposalError(res, tp));
    },
    onSuccess: () => {
      showToast({ message: tp("submittedToast"), severity: "success" });
      router.refresh();
    },
    onError: (err) => showToast({ message: err.message, severity: "error" }),
  });

  const withdraw = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/drills/proposals/${proposal.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await proposalError(res, tp));
    },
    onSuccess: () => {
      clearDeviceDraft(key);
      showToast({ message: tp("withdrawnToast"), severity: "success" });
      router.push(categoryPath("exercises"));
    },
    onError: (err) => showToast({ message: err.message, severity: "error" }),
  });

  const busy = save.isPending || submit.isPending || withdraw.isPending;
  const title = fields.title.trim() || proposal.title;

  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        <Box component="strong" sx={{ color: "text.primary" }}>
          {tp(`states.${proposal.state}`)}
        </Box>
        {" · "}
        {isDraft ? tp("draftHint") : tp("sentHint")}
        {dirty && ` · ${tp("unsaved")}`}
      </Typography>

      {device.draft && (
        <DeviceDraftAlert
          onRestore={() => {
            dispatch({ type: "replace", content: device.draft! });
            device.restored();
          }}
          onDiscard={device.discard}
        />
      )}

      <Paper
        variant="outlined"
        sx={{ p: { xs: 2, sm: 3 }, borderRadius: RADIUS.lg, display: "grid", gap: 2.5, mb: 3 }}
      >
        <Typography variant="h6" component="h2">
          {tp("details")}
        </Typography>
        <TextField
          label={tp("titleLabel")}
          value={fields.title}
          onChange={(e) => set("title", e.target.value)}
          required
          fullWidth
          slotProps={{ htmlInput: { maxLength: 80 } }}
        />
        <FormControl>
          <FormLabel id="proposal-kind" sx={{ mb: 0.75 }}>
            {tp("kindLabel")}
          </FormLabel>
          <ToggleButtonGroup
            exclusive
            value={fields.kind}
            onChange={(_, v: Kind | null) => v && set("kind", v)}
            aria-labelledby="proposal-kind"
            sx={{ "& .MuiToggleButton-root": { minHeight: TOUCH_TARGET_SIZE, flex: 1 } }}
          >
            <ToggleButton value="EXERCISE">{t("kinds.EXERCISE")}</ToggleButton>
            <ToggleButton value="WARMUP">{t("kinds.WARMUP")}</ToggleButton>
          </ToggleButtonGroup>
        </FormControl>
        <TextField
          label={tp("descriptionLabel")}
          value={fields.description}
          onChange={(e) => set("description", e.target.value)}
          multiline
          minRows={3}
          maxRows={10}
          fullWidth
          helperText={tp("descriptionHelp", {
            count: fields.description.length,
            max: MAX_DESCRIPTION,
          })}
          slotProps={{ htmlInput: { maxLength: MAX_DESCRIPTION } }}
        />
        <FormControl>
          <FormControlLabel
            control={
              <Checkbox
                checked={fields.showAuthor}
                onChange={(e) => set("showAuthor", e.target.checked)}
              />
            }
            label={tp("showAuthor")}
          />
          <FormHelperText sx={{ mx: 0 }}>
            {firstName ? tp("showAuthorHelp", { name: firstName }) : tp("showAuthorHelpNoName")}
          </FormHelperText>
        </FormControl>
        <Typography variant="body2" color="text.secondary">
          {tp("signed")}
        </Typography>
      </Paper>

      <Typography variant="h6" component="h2" sx={{ mb: 1.5 }}>
        {tp("drawing")}
      </Typography>
      <DrillCanvasEditor
        title={title}
        court={proposal.court}
        history={history}
        dispatch={dispatch}
        toolbarEnd={
          <Button
            variant="text"
            startIcon={<PlayCircleOutlineIcon />}
            onClick={() => setPreview(true)}
            sx={{ minHeight: TOUCH_TARGET_SIZE }}
          >
            {tp("preview")}
          </Button>
        }
      />

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1.5,
          mt: 3,
          pt: 2,
          borderTop: "1px solid",
          borderColor: "divider",
          alignItems: "center",
        }}
      >
        {isDraft && (
          <Button
            variant="contained"
            size="large"
            onClick={() => setConfirm("submit")}
            disabled={busy || !fields.title.trim() || content.pieces.length === 0}
          >
            {tp("submit")}
          </Button>
        )}
        <Button
          variant={isDraft ? "outlined" : "contained"}
          size="large"
          onClick={() => save.mutate()}
          disabled={busy || !dirty || !fields.title.trim()}
        >
          {dirty ? tp("save") : tp("saved")}
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="text"
          color="inherit"
          onClick={() => setConfirm("withdraw")}
          disabled={busy}
          sx={{ minHeight: TOUCH_TARGET_SIZE }}
        >
          {tp("withdraw")}
        </Button>
      </Box>

      {preview && (
        <DrillPreviewDialog
          title={title}
          court={proposal.court}
          content={content}
          onClose={() => setPreview(false)}
        />
      )}
      {/* Una conferma breve: finestra piccola anche sul telefono. */}
      <Dialog open={!!confirm} onClose={() => setConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {confirm === "withdraw" ? tp("withdrawConfirmTitle") : tp("submitConfirmTitle")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirm === "withdraw" ? tp("withdrawConfirmText") : tp("submitConfirmText")}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)}>{tp("cancel")}</Button>
          <Button
            variant="contained"
            onClick={() => {
              const what = confirm;
              setConfirm(null);
              if (what === "withdraw") withdraw.mutate();
              else submit.mutate();
            }}
          >
            {confirm === "withdraw" ? tp("withdraw") : tp("submit")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
