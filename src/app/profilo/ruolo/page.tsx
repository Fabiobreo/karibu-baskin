import { auth } from "@/lib/authjs";
import { getLocale, getTranslations } from "next-intl/server";
import { Breadcrumbs, Container, Typography, Link as MuiLink } from "@mui/material";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import PageHero from "@/components/common/PageHero";
import RoleQuizClient from "@/components/profile/RoleQuizClient";
import { prisma } from "@/lib/db";
import { getRolesInfo } from "@/lib/content/baskinInfo";
import { loadGuestOnboarding } from "@/lib/guestOnboarding";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Il tuo ruolo Baskin",
  description: "Scopri il tuo ruolo nel Baskin con qualche domanda veloce.",
  path: "/profilo/ruolo",
  noindex: true,
});

export const revalidate = 0;

export default async function RuoloPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [user, onboarding, locale, t, tProfile] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        sportRole: true,
        sportRoleVariant: true,
        sportRoleSuggested: true,
        sportRoleSuggestedVariant: true,
      },
    }),
    loadGuestOnboarding(userId),
    getLocale(),
    getTranslations("roleQuiz"),
    getTranslations("profile"),
  ]);
  if (!user) redirect("/login");

  const confirmed =
    user.sportRole != null
      ? { role: user.sportRole, variant: user.sportRoleVariant ?? undefined }
      : null;
  const suggested =
    user.sportRoleSuggested != null
      ? { role: user.sportRoleSuggested, variant: user.sportRoleSuggestedVariant ?? undefined }
      : null;

  return (
    <>
      <PageHero
        chip={t("heroChip")}
        title={t("heroTitle")}
        subtitle={t("heroSubtitle")}
        subtitleMaxWidth={540}
        breadcrumb={
          <Breadcrumbs
            aria-label="breadcrumb"
            sx={{ "& .MuiBreadcrumbs-separator": { color: "rgba(255,255,255,0.4)" } }}
          >
            {/* Ancora normale, non `component={Link}`: siamo in un Server Component. */}
            <MuiLink
              href="/profilo"
              underline="hover"
              variant="body2"
              sx={{ color: "rgba(255,255,255,0.7)", "&:hover": { color: "common.white" } }}
            >
              {tProfile("title")}
            </MuiLink>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.9)" }}>
              {t("heroTitle")}
            </Typography>
          </Breadcrumbs>
        }
      />
      <Container maxWidth="sm" sx={{ py: { xs: 4, md: 6 } }}>
        <RoleQuizClient
          confirmed={confirmed}
          suggested={suggested}
          rolesInfo={getRolesInfo(locale)}
          nextSession={
            onboarding.registeredSession
              ? { href: onboarding.registeredSession.href, registered: true }
              : onboarding.nextSession
                ? { href: onboarding.nextSession.href, registered: false }
                : null
          }
        />
      </Container>
    </>
  );
}
