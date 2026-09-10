"use client";
import { useState } from "react";
import { Box, Button, TextField, CircularProgress } from "@mui/material";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useToast } from "@/context/ToastContext";

// Controllo volutamente permissivo: la verifica vera è che il link arrivi davvero
// nella casella. Serve solo a intercettare i refusi evidenti prima dell'invio.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function MagicLinkForm({ callbackUrl = "/" }: { callbackUrl?: string }) {
  const t = useTranslations("pages.login");
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) {
      showToast({ message: t("invalidEmail"), severity: "error" });
      return;
    }
    setLoading(true);
    try {
      // Redirect gestito da Auth.js verso la pagina `verifyRequest`.
      await signIn("resend", { email: value, callbackUrl });
    } catch {
      showToast({ message: t("emailError"), severity: "error" });
      setLoading(false);
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: "grid", gap: 1.5 }}>
      <TextField
        type="email"
        name="email"
        size="small"
        fullWidth
        required
        autoComplete="email"
        label={t("emailLabel")}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={loading}
      />
      {/* `text` e non `outlined`: Google e' la via principale e resta nella
          sua forma canonica, quindi la gerarchia la fa il magic link
          arretrando. */}
      <Button
        type="submit"
        variant="text"
        fullWidth
        disabled={loading}
        startIcon={loading ? <CircularProgress size={18} /> : <MailOutlineIcon />}
        sx={{ textTransform: "none", fontWeight: 600 }}
      >
        {loading ? t("emailSending") : t("emailCta")}
      </Button>
    </Box>
  );
}
