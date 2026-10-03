import { auth } from "@/lib/authjs";
import { getLocale, getTranslations } from "next-intl/server";
import { Box, Container } from "@mui/material";
import { columnSx } from "@/lib/layout";
import { redirect } from "next/navigation";
import { loginHref } from "@/lib/loginReturn";
import type { Metadata } from "next";
import PageHeader from "@/components/common/PageHeader";
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
  if (!session?.user?.id) redirect(loginHref("/profilo/ruolo"));
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
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Box sx={columnSx("reading")}>
          <PageHeader
            title={t("heroTitle")}
            subtitle={t("heroSubtitle")}
            breadcrumb={[{ label: tProfile("title"), href: "/profilo" }, { label: t("heroTitle") }]}
          />
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
        </Box>
      </Container>
    </>
  );
}
