import { Container, Paper, Typography, Box } from "@mui/material";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import { getTranslations } from "next-intl/server";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import TestLoginForm from "@/components/TestLoginForm";

const testLoginEnabled = process.env.ENABLE_TEST_LOGIN === "true";

export default async function LoginPage() {
  const t = await getTranslations("pages");

  return (
    <Container maxWidth="xs" sx={{ pt: 10 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: "center" }}>
        <SportsBasketballIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
        <Typography variant="h5" fontWeight={700} gutterBottom>
          {t("login.title")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {t("login.subtitle")}
        </Typography>
        <Box>
          <GoogleSignInButton callbackUrl="/" />
        </Box>

        {testLoginEnabled && <TestLoginForm callbackUrl="/" />}
      </Paper>
    </Container>
  );
}
