import Link from "next/link";
import { Alert, Button, Container } from "@mui/material";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import { getTranslations } from "next-intl/server";
import { countPendingAvailabilities } from "@/lib/matches/myAvailabilities";

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
    <Container maxWidth="md" sx={{ pt: 2 }}>
      <Alert
        severity="warning"
        icon={<EventAvailableIcon fontSize="small" />}
        sx={{ alignItems: "center", "& .MuiAlert-message": { fontWeight: 600 } }}
        action={
          <Link href="/profilo/disponibilita" style={{ textDecoration: "none" }}>
            <Button color="inherit" size="small" sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
              {t("respondNow")}
            </Button>
          </Link>
        }
      >
        {t("pendingAvailabilities", { count })}
      </Alert>
    </Container>
  );
}
