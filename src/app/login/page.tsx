import { Container, Paper, Typography, Box } from "@mui/material";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import TestLoginForm from "@/components/TestLoginForm";

const testLoginEnabled = process.env.ENABLE_TEST_LOGIN === "true";

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

        {testLoginEnabled && <TestLoginForm callbackUrl="/" />}
      </Paper>
    </Container>
  );
}
