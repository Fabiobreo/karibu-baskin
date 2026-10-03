import { auth } from "@/lib/authjs";
import { getTranslations } from "next-intl/server";
import { Box, Container } from "@mui/material";
import { columnSx } from "@/lib/layout";
import PageHeader from "@/components/common/PageHeader";
import { redirect } from "next/navigation";
import { loadMyAvailabilityPage } from "@/lib/matches/myAvailabilities";
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

  const { matches, hasTeams, hasChildren } = await loadMyAvailabilityPage(
    userId,
    session.user.name ?? "Tu"
  );

  const t = await getTranslations("profile");

  return (
    <>
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Box sx={columnSx("main")}>
          <PageHeader
            title={t("myAvailabilities")}
            subtitle={t("availabilitiesHeroSubtitle")}
            breadcrumb={[
              { label: t("title"), href: "/profilo" },
              { label: t("availabilitiesTitle") },
            ]}
          />
          <MieDisponibilitaClient
            initialMatches={matches}
            hasTeams={hasTeams}
            hasChildren={hasChildren}
          />
        </Box>
      </Container>
    </>
  );
}
