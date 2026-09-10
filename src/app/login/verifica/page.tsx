import { Container, Paper, Typography, Box, Button } from "@mui/material";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Controlla la posta",
  description: "Ti abbiamo inviato un link per completare l'accesso.",
  path: "/login/verifica",
  noindex: true,
});

/**
 * Pagina mostrata da Auth.js (`pages.verifyRequest`) dopo la richiesta di un
 * magic link. Non conferma mai l'esistenza dell'indirizzo: il testo è identico
 * sia che l'email esista sia che non esista.
 */
export default async function VerifyRequestPage() {
  const t = await getTranslations("pages.verifyRequest");

  return (
    <Container maxWidth="xs" sx={{ pt: 10 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: "center" }}>
        <MarkEmailReadIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
        <Typography variant="h5" component="h1" fontWeight={700} gutterBottom>
          {t("title")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t("body")}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 3 }}>
          {t("spamHint")}
        </Typography>
        <Box>
          <Link href="/login">
            <Button variant="outlined" sx={{ textTransform: "none", fontWeight: 600 }}>
              {t("back")}
            </Button>
          </Link>
        </Box>
      </Paper>
    </Container>
  );
}
