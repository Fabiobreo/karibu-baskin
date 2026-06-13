import Link from "next/link";
import { Alert, Button, Container } from "@mui/material";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import { getTranslations } from "next-intl/server";

/**
 * Banner "Hai N disponibilità da confermare" — Server Component.
 * Il conteggio arriva da countPendingAvailabilities() in @/lib/matches/availabilityPending.
 */
export default async function PendingAvailabilityBanner({ count }: { count: number }) {
  if (count <= 0) return null;
  const t = await getTranslations("profile");

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
