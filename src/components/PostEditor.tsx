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

  // Sincronizza quando il valore esterno cambia (es. caricamento bozza)
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (editor && !initialized && value) {
      editor.commands.setContent(value);
      setInitialized(true);
    }
  }, [editor, value, initialized]);

  function addLink() {
    const url = window.prompt("URL del link:");
    if (!url) return;
    editor?.chain().focus().setLink({ href: url }).run();
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
          gap: 0.5,
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
            size="small"
            onClick={() => editor.chain().focus().toggleBold().run()}
            color={editor.isActive("bold") ? "primary" : "default"}
          >
            <FormatBoldIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Corsivo">
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            color={editor.isActive("italic") ? "primary" : "default"}
          >
            <FormatItalicIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        <ToggleButtonGroup size="small" exclusive>
          <Tooltip title="Lista puntata">
            <ToggleButton
              value="bullet"
              selected={editor.isActive("bulletList")}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              <FormatListBulletedIcon fontSize="small" />
            </ToggleButton>
          </Tooltip>
          <Tooltip title="Lista numerata">
            <ToggleButton
              value="ordered"
              selected={editor.isActive("orderedList")}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
              <FormatListNumberedIcon fontSize="small" />
            </ToggleButton>
          </Tooltip>
        </ToggleButtonGroup>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        <Tooltip title="Citazione">
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            color={editor.isActive("blockquote") ? "primary" : "default"}
          >
            <FormatQuoteIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        <Tooltip title="Aggiungi link">
          <IconButton
            size="small"
            onClick={addLink}
            color={editor.isActive("link") ? "primary" : "default"}
          >
            <LinkIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Rimuovi link">
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().unsetLink().run()}
            disabled={!editor.isActive("link")}
          >
            <LinkOffIcon fontSize="small" />
          </IconButton>
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
            fontSize: "0.95rem",
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
    </Paper>
  );
}
