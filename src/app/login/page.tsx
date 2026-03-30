import { Container, Paper, Typography, Box } from "@mui/material";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import GoogleSignInButton from "@/components/GoogleSignInButton";

export default function LoginPage() {
  return (
    <Container maxWidth="xs" sx={{ pt: 10 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: "center" }}>
        <SportsBasketballIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Accedi a Karibu Baskin
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Accedi con il tuo account Google per iscriverti agli allenamenti e gestire il tuo profilo.
        </Typography>
        <Box>
          <GoogleSignInButton callbackUrl="/" />
        </Box>
        <Typography variant="caption" color="text.disabled" sx={{ display: "block", mt: 2 }}>
          Al primo accesso il tuo account sarà in attesa di approvazione da parte dell&apos;admin.
        </Typography>
      </Paper>
    </Container>
  );
}
