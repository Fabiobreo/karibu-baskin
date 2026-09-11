import { auth } from "@/lib/authjs";
import { getTranslations } from "next-intl/server";
import { Breadcrumbs, Container, Typography, Link as MuiLink } from "@mui/material";
import PageHero from "@/components/common/PageHero";
import { redirect } from "next/navigation";
import { loadMyAvailabilityMatches } from "@/lib/matches/myAvailabilities";
import MieDisponibilitaClient from "@/components/matches/MieDisponibilitaClient";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Le mie disponibilità",
  description: "Le tue disponibilità per le partite del Karibu Baskin.",
  path: "/profilo/disponibilita",
  noindex: true,
});

export const revalidate = 0;

export default async function MieDisponibilitaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const items = await loadMyAvailabilityMatches(userId, session.user.name ?? "Tu");

  const t = await getTranslations("profile");

  return (
    <>
      <PageHero
        chip={t("availabilitiesHeroChip")}
        title={t("myAvailabilities")}
        subtitle={t("availabilitiesHeroSubtitle")}
        subtitleMaxWidth={540}
        breadcrumb={
          <Breadcrumbs
            aria-label="breadcrumb"
            sx={{ "& .MuiBreadcrumbs-separator": { color: "rgba(255,255,255,0.4)" } }}
          >
            {/* Niente `component={Link}`: qui siamo in un Server Component e
                passare un componente a un Client Component non attraversa il
                confine RSC. Resta un'ancora normale. */}
            <MuiLink
              href="/profilo"
              underline="hover"
              variant="body2"
              sx={{ color: "rgba(255,255,255,0.7)", "&:hover": { color: "common.white" } }}
            >
              {t("title")}
            </MuiLink>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.9)" }}>
              {t("availabilitiesTitle")}
            </Typography>
          </Breadcrumbs>
        }
      />
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        <MieDisponibilitaClient initialMatches={items} />
      </Container>
    </>
  );
}
