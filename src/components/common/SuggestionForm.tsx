"use client";
import { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  CircularProgress,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import SendIcon from "@mui/icons-material/Send";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useTranslations } from "next-intl";
import { useToast } from "@/context/ToastContext";
import { SUGGESTION_CATEGORIES } from "@/lib/schemas/suggestion";
import { readError } from "@/lib/fetchJson";

export default function SuggestionForm() {
  const { showToast } = useToast();
  const t = useTranslations("suggestion");
  const tCommon = useTranslations("common");
  const CATEGORY_LABELS: Record<(typeof SUGGESTION_CATEGORIES)[number], string> = {
    APP: t("catApp"),
    ALLENAMENTI: t("catTrainings"),
    PARTITE_EVENTI: t("catMatches"),
    ALTRO: t("catOther"),
  };
  const [category, setCategory] = useState<string>("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, message }),
      });
      if (!res.ok) {
        const message = await readError(res);
        throw new Error(message);
      }
      setSent(true);
      setCategory("");
      setMessage("");
    } catch (err) {
      showToast({
        message: err instanceof Error ? err.message : t("sendError"),
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1.5,
          py: 4,
          textAlign: "center",
        }}
      >
        <CheckCircleIcon sx={{ fontSize: 48, color: "success.main" }} />
        <Typography variant="h6" fontWeight={700}>
          {t("thankYou")}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t("thankYouDesc")}
        </Typography>
        <Button variant="outlined" size="small" onClick={() => setSent(false)} sx={{ mt: 1 }}>
          {t("sendAnother")}
        </Button>
      </Box>
    );
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      noValidate
      sx={{ display: "flex", flexDirection: "column", gap: 2 }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary" }}>
        <LockIcon sx={{ fontSize: 18 }} />
        <Typography variant="caption">{t("anonymous")}</Typography>
      </Box>

      <FormControl size="small" fullWidth required>
        <InputLabel id="suggestion-category-label" shrink>
          {t("category")}
        </InputLabel>
        <Select
          labelId="suggestion-category-label"
          label={t("category")}
          value={category}
          displayEmpty
          notched
          onChange={(e) => setCategory(e.target.value)}
          renderValue={(val) =>
            val ? (
              CATEGORY_LABELS[val as keyof typeof CATEGORY_LABELS]
            ) : (
              <Typography component="span" color="text.disabled">
                {t("selectCategory")}
              </Typography>
            )
          }
        >
          {SUGGESTION_CATEGORIES.map((c) => (
            <MenuItem key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        label={t("yourSuggestion")}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        required
        size="small"
        fullWidth
        multiline
        minRows={4}
        inputProps={{ maxLength: 2000 }}
        helperText={`${message.length}/2000`}
      />

      <Button
        type="submit"
        variant="contained"
        disabled={loading || !category || message.trim().length < 5}
        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
        sx={{ alignSelf: "flex-start", fontWeight: 700, borderRadius: 2 }}
      >
        {loading ? tCommon("sending") : t("submit")}
      </Button>
    </Box>
  );
}
