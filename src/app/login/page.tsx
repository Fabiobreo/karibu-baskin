import { Container, Paper, Typography, Box, Divider } from "@mui/material";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import GoogleSignInButton from "@/components/common/GoogleSignInButton";
import MagicLinkForm from "@/components/common/MagicLinkForm";
import TestLoginForm from "@/components/common/TestLoginForm";
import { buildMetadata } from "@/lib/seo";
import { safeCallbackPath } from "@/lib/loginReturn";

export const metadata = buildMetadata({
  title: "Accedi",
  description: "Accedi al sito del Karibu Baskin con Google o con un link via email.",
  path: "/login",
  noindex: true,
});

const testLoginEnabled = process.env.ENABLE_TEST_LOGIN === "true";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const [t, params] = await Promise.all([getTranslations("pages"), searchParams]);
  // Chi arriva da una pagina (es. il form d'iscrizione) ci torna dopo l'accesso.
  const callbackUrl = safeCallbackPath(params.callbackUrl);

  return (
    <Container maxWidth="xs" sx={{ pt: 10 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: "center" }}>
        {/* Stemma del club, non un pallone generico (UX-51). */}
        <Image
          src="/logo.png"
          alt="Karibu Baskin"
          width={72}
          height={72}
          priority
          style={{ objectFit: "contain", display: "block", margin: "0 auto 8px" }}
        />
        <Typography variant="h5" component="h1" gutterBottom>
          {t("login.title")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {t("login.subtitle")}
        </Typography>
        <Box>
          <GoogleSignInButton callbackUrl={callbackUrl} />
        </Box>

        <Divider sx={{ my: 3 }}>
          <Typography variant="caption" color="text.secondary">
            {t("login.divider")}
          </Typography>
        </Divider>

        <MagicLinkForm callbackUrl={callbackUrl} />
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 1.5, textAlign: "left" }}
        >
          {t("login.emailHelp")}
        </Typography>

        {testLoginEnabled && <TestLoginForm callbackUrl={callbackUrl} />}
      </Paper>
    </Container>
  );
}
