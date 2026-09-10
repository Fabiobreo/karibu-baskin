"use client";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { submitContactForm, type ContactFormState } from "@/app/actions/contact";
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Link as MuiLink,
} from "@mui/material";
import NextLink from "next/link";
import SendIcon from "@mui/icons-material/Send";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

const initialState: ContactFormState = {};

export default function ContactForm() {
  const t = useTranslations("pages.contatti");
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const [state, action, pending] = useActionState(submitContactForm, initialState);

  if (state.success) {
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
          {t("formSent")}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t("formSentDesc")}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      component="form"
      action={action}
      noValidate
      sx={{ display: "flex", flexDirection: "column", gap: 2 }}
    >
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
        {t("formTitle")}
      </Typography>
      {state.error && (
        <Alert severity="error" sx={{ py: 0.5 }}>
          {state.error}
        </Alert>
      )}
      {/* Honeypot anti-spam. Un umano non lo vede né ci arriva con il tab; un
          bot che compila ogni campo sì. Fuori schermo e non `display: none`,
          perché molti bot saltano i campi nascosti in quel modo. Nome non
          semantico: un nome come "website" o "company" attirerebbe l'autofill
          del browser e scarterebbe il messaggio di una persona vera. */}
      <Box
        aria-hidden="true"
        sx={{
          position: "absolute",
          left: "-10000px",
          width: "1px",
          height: "1px",
          overflow: "hidden",
        }}
      >
        <input type="text" name="kbhp" tabIndex={-1} autoComplete="off" defaultValue="" />
      </Box>
      <TextField
        name="name"
        label={t("formName")}
        required
        size="small"
        fullWidth
        autoComplete="name"
        inputProps={{ maxLength: 100 }}
      />
      <TextField
        name="email"
        label={t("formEmail")}
        type="email"
        required
        size="small"
        fullWidth
        autoComplete="email"
        inputProps={{ maxLength: 200 }}
      />
      <TextField
        name="message"
        label={t("formMessage")}
        required
        size="small"
        fullWidth
        multiline
        minRows={4}
        inputProps={{ maxLength: 2000 }}
      />
      <Button
        type="submit"
        variant="contained"
        disabled={pending}
        startIcon={pending ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
        sx={{ alignSelf: "flex-start" }}
      >
        {pending ? tCommon("sending") : t("formSubmit")}
      </Button>
      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
        {t("formPrivacy")}{" "}
        <MuiLink component={NextLink} href="/privacy">
          {tNav("privacyPolicy")}
        </MuiLink>
      </Typography>
    </Box>
  );
}
