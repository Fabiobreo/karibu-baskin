"use client";
import { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import {
  Box,
  IconButton,
  Tooltip,
  Divider,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from "@mui/material";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import FormatQuoteIcon from "@mui/icons-material/FormatQuote";
import LinkIcon from "@mui/icons-material/Link";
import LinkOffIcon from "@mui/icons-material/LinkOff";

interface PostEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export default function PostEditor({
  value,
  onChange,
  placeholder = "Scrivi qui il contenuto...",
  minHeight = 200,
}: PostEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
    ],
    content: value,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        style: `min-height:${minHeight}px; padding: 12px; outline: none;`,
        "data-placeholder": placeholder,
      },
    },
  });

  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (editor && !initialized && value) {
      editor.commands.setContent(value);
      setInitialized(true);
    }
  }, [editor, value, initialized]);

  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  function openLinkDialog() {
    const current = (editor?.getAttributes("link")?.href as string | undefined) ?? "";
    setLinkUrl(current);
    setLinkDialogOpen(true);
  }

  function confirmLink() {
    const url = linkUrl.trim();
    if (!url) {
      setLinkDialogOpen(false);
      return;
    }
    editor?.chain().focus().setLink({ href: url }).run();
    setLinkDialogOpen(false);
  }

  if (!editor) return null;

  return (
    <Paper
      variant="outlined"
      sx={{
        borderColor: "divider",
        borderRadius: 1,
        overflow: "hidden",
        "&:focus-within": { borderColor: "primary.main" },
      }}
    >
      {/* Toolbar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: { xs: 0.75, sm: 0.5 },
          px: 1,
          py: 0.5,
          borderBottom: "1px solid",
          borderColor: "divider",
          flexWrap: "wrap",
          bgcolor: "action.hover",
        }}
      >
        <Tooltip title="Grassetto">
          <IconButton
            size="medium"
            aria-label="Grassetto"
            onClick={() => editor.chain().focus().toggleBold().run()}
            color={editor.isActive("bold") ? "primary" : "default"}
          >
            <FormatBoldIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Corsivo">
          <IconButton
            size="medium"
            aria-label="Corsivo"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            color={editor.isActive("italic") ? "primary" : "default"}
          >
            <FormatItalicIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Divider
          orientation="vertical"
          flexItem
          sx={{ mx: 0.5, display: { xs: "none", sm: "block" } }}
        />

        <ToggleButtonGroup size="medium">
          <Tooltip title="Lista puntata">
            <ToggleButton
              value="bullet"
              aria-label="Lista puntata"
              selected={editor.isActive("bulletList")}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              <FormatListBulletedIcon fontSize="small" />
            </ToggleButton>
          </Tooltip>
          <Tooltip title="Lista numerata">
            <ToggleButton
              value="ordered"
              aria-label="Lista numerata"
              selected={editor.isActive("orderedList")}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
              <FormatListNumberedIcon fontSize="small" />
            </ToggleButton>
          </Tooltip>
        </ToggleButtonGroup>

        <Divider
          orientation="vertical"
          flexItem
          sx={{ mx: 0.5, display: { xs: "none", sm: "block" } }}
        />

        <Tooltip title="Citazione">
          <IconButton
            size="medium"
            aria-label="Citazione"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            color={editor.isActive("blockquote") ? "primary" : "default"}
          >
            <FormatQuoteIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Divider
          orientation="vertical"
          flexItem
          sx={{ mx: 0.5, display: { xs: "none", sm: "block" } }}
        />

        <Tooltip title="Aggiungi link">
          <IconButton
            size="medium"
            aria-label="Aggiungi link"
            onClick={openLinkDialog}
            color={editor.isActive("link") ? "primary" : "default"}
          >
            <LinkIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Rimuovi link">
          <span>
            <IconButton
              size="medium"
              aria-label="Rimuovi link"
              onClick={() => editor.chain().focus().unsetLink().run()}
              disabled={!editor.isActive("link")}
            >
              <LinkOffIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {/* Contenuto editor */}
      <Box
        sx={{
          "& .tiptap": {
            minHeight,
            px: 1.5,
            py: 1.5,
            outline: "none",
            fontSize: "1rem",
            lineHeight: 1.6,
            color: "text.primary",
            "& p": { my: 0.5 },
            "& ul, & ol": { pl: 3 },
            "& blockquote": {
              borderLeft: "3px solid",
              borderColor: "divider",
              pl: 1.5,
              ml: 0,
              color: "text.secondary",
              fontStyle: "italic",
            },
            "& a": { color: "primary.main" },
            "&:empty::before, & p:empty::before": {
              content: "attr(data-placeholder)",
              color: "text.disabled",
              pointerEvents: "none",
            },
          },
        }}
      >
        <EditorContent editor={editor} />
      </Box>

      <Dialog
        open={linkDialogOpen}
        onClose={() => setLinkDialogOpen(false)}
        fullWidth
        maxWidth="xs"
        aria-labelledby="link-dialog-title"
      >
        <DialogTitle id="link-dialog-title">Inserisci link</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="URL"
            type="url"
            fullWidth
            placeholder="https://..."
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                confirmLink();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLinkDialogOpen(false)}>Annulla</Button>
          <Button variant="contained" onClick={confirmLink} disabled={!linkUrl.trim()}>
            Conferma
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
