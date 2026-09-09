import { Container, Paper, Typography, Box, Divider } from "@mui/material";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import { getTranslations } from "next-intl/server";
import GoogleSignInButton from "@/components/common/GoogleSignInButton";
import MagicLinkForm from "@/components/common/MagicLinkForm";
import TestLoginForm from "@/components/common/TestLoginForm";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Accedi",
  description: "Accedi al sito del Karibu Baskin con Google o con un link via email.",
  path: "/login",
  noindex: true,
});

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

        <Divider sx={{ my: 3 }}>
          <Typography variant="caption" color="text.secondary">
            {t("login.divider")}
          </Typography>
        </Divider>

        <MagicLinkForm callbackUrl="/" />
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 1.5, textAlign: "left" }}
        >
          {t("login.emailHelp")}
        </Typography>

        {testLoginEnabled && <TestLoginForm callbackUrl="/" />}
      </Paper>
    </Container>
  );
}
