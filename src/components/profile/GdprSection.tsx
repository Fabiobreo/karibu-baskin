import Link from "next/link";
import { Box, Button, Typography } from "@mui/material";
import { getTranslations } from "next-intl/server";

/** Sezione Privacy del profilo: export dati (art. 20) e richiesta cancellazione (art. 17). */
export default async function GdprSection({ email }: { email: string }) {
  const t = await getTranslations("profile");

  return (
    <>
      {/* Export dati personali (GDPR art. 20) */}
      <Box sx={{ pt: 1 }}>
        <Typography variant="caption" color="text.disabled" display="block" sx={{ mb: 1 }}>
          {t("gdprExportNote")}
        </Typography>
        <a href="/api/users/me/export" download style={{ textDecoration: "none" }}>
          <Button size="small" variant="outlined" sx={{ fontSize: "0.78rem" }}>
            {t("downloadData")}
          </Button>
        </a>
      </Box>

      {/* Eliminazione account (GDPR art. 17) */}
      <Box sx={{ mt: 3, pt: 3, borderTop: "1px solid", borderColor: "divider" }}>
        <Typography variant="caption" color="text.disabled" display="block" sx={{ mb: 1 }}>
          {t("gdprDeleteNote")}
        </Typography>
        <Link
          href={`mailto:asdkaribubaskin@gmail.com?subject=${encodeURIComponent("Richiesta eliminazione account GDPR")}&body=${encodeURIComponent(`Salve,\n\nrichiedo l'eliminazione del mio account e di tutti i dati personali associati.\n\nEmail account: ${email}\n\nGrazie.`)}`}
        >
          <Button size="small" color="error" variant="outlined" sx={{ fontSize: "0.78rem" }}>
            {t("deleteAccount")}
          </Button>
        </Link>
      </Box>
    </>
  );
}
