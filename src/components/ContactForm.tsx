"use client";
import { useActionState } from "react";
import { submitContactForm, type ContactFormState } from "@/app/actions/contact";
import {
  Box, TextField, Button, Typography, Alert, CircularProgress,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

const initialState: ContactFormState = {};

export default function ContactForm() {
  const [state, action, pending] = useActionState(submitContactForm, initialState);

  if (state.success) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5, py: 4, textAlign: "center" }}>
        <CheckCircleIcon sx={{ fontSize: 48, color: "success.main" }} />
        <Typography variant="h6" fontWeight={700}>Messaggio inviato!</Typography>
        <Typography variant="body2" color="text.secondary">
          Ti risponderemo il prima possibile all&apos;indirizzo fornito.
        </Typography>
      </Box>
    );
  }

  return (
    <Box component="form" action={action} noValidate sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
        Scrivici un messaggio
      </Typography>
      {state.error && (
        <Alert severity="error" sx={{ py: 0.5 }}>{state.error}</Alert>
      )}
      <TextField
        name="name"
        label="Nome"
        required
        size="small"
        fullWidth
        autoComplete="name"
        inputProps={{ maxLength: 100 }}
      />
      <TextField
        name="email"
        label="Email"
        type="email"
        required
        size="small"
        fullWidth
        autoComplete="email"
        inputProps={{ maxLength: 200 }}
      />
      <TextField
        name="message"
        label="Messaggio"
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
        {pending ? "Invio in corso..." : "Invia messaggio"}
      </Button>
    </Box>
  );
}
