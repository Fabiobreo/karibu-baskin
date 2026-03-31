import { Container, Paper, Typography, Box } from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import GoogleSignInButton from "@/components/GoogleSignInButton";

export default function AdminLoginPage() {
  return (
    <Container maxWidth="xs" sx={{ pt: 10 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: "center" }}>
        <LockIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
        <Typography variant="h5" gutterBottom fontWeight={700}>
          Area Admin
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Accedi con il tuo account Google — solo gli utenti con ruolo Coach o Admin possono entrare.
        </Typography>
        <GoogleSignInButton callbackUrl="/admin" />
      </Paper>
    </Container>
  );
}
