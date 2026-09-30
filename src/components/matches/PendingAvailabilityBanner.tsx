import { Alert, Button, Container } from "@mui/material";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import { getTranslations } from "next-intl/server";
import { countPendingAvailabilities } from "@/lib/matches/myAvailabilities";
import { FONT_WEIGHT } from "@/lib/fontWeight";

/**
 * Banner "Hai N disponibilità da confermare" — Server Component.
 * Calcola da sé il conteggio, così la home lo avvolge in `<Suspense>` senza
 * aspettarlo prima di mandare la pagina.
 */
export default async function PendingAvailabilityBanner({ userId }: { userId: string }) {
  const [count, t] = await Promise.all([
    countPendingAvailabilities(userId),
    getTranslations("profile"),
  ]);
  if (count <= 0) return null;

  return (
    <Container maxWidth="lg" sx={{ pt: 2 }}>
      <Alert
        severity="warning"
        icon={<EventAvailableIcon fontSize="small" />}
        sx={{ alignItems: "center", "& .MuiAlert-message": { fontWeight: FONT_WEIGHT.semibold } }}
        action={
          <Button
            href="/profilo/disponibilita"
            color="inherit"
            size="small"
            sx={{ whiteSpace: "nowrap" }}
          >
            {t("respondNow")}
          </Button>
        }
      >
        {t("pendingAvailabilities", { count })}
      </Alert>
    </Container>
  );
}
