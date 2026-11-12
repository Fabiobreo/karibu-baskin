import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Alert, Box, Button, Container, Stack } from "@mui/material";
import type { Metadata } from "next";
import { auth } from "@/lib/authjs";
import { prisma } from "@/lib/db";
import { isStaffRole } from "@/lib/authRoles";
import { guardianOf } from "@/lib/guardians";
import { loginHref } from "@/lib/loginReturn";
import { columnSx } from "@/lib/layout";
import { buildMetadata } from "@/lib/seo";
import { parseSeasonParam } from "@/lib/season/seasonUtils";
import { recapAccess } from "@/lib/season/seasonRecap";
import {
  loadChildSubject,
  loadSeasonRecap,
  loadSelfSubject,
  type RecapSubject,
} from "@/lib/season/loadSeasonRecap";
import { recapPath } from "@/lib/season/recapPaths";
import PageHeader from "@/components/common/PageHeader";
import SeasonRecapView from "@/components/profile/SeasonRecapView";

export const metadata: Metadata = buildMetadata({
  title: "La tua stagione",
  description: "Com'è andata la tua stagione con il Karibu Baskin.",
  path: "/profilo/stagione",
  noindex: true,
});

/**
 * "La tua stagione" (UX-60): il riepilogo personale di fine stagione. Privato:
 * la persona e i genitori, dopo la pubblicazione dell'admin; allenatori e
 * admin anche prima, come anteprima. `?per=<scheda figlio>` sceglie un figlio,
 * `?utente=<account>` (solo staff, da `/admin/utenti`) un adulto.
 */
export default async function SeasonRecapPage({
  params,
  searchParams,
}: {
  params: Promise<{ season: string }>;
  searchParams: Promise<{ per?: string | string[]; utente?: string | string[] }>;
}) {
  const [session, { season: rawSeason }, query, t] = await Promise.all([
    auth(),
    params,
    searchParams,
    getTranslations("seasonRecap"),
  ]);
  const season = parseSeasonParam(rawSeason);
  if (!season) notFound();

  const per = typeof query.per === "string" ? query.per : null;
  const utente = typeof query.utente === "string" ? query.utente : null;
  const viewerId = session?.user?.id ?? null;
  if (!viewerId) {
    const qs = per ? `?per=${encodeURIComponent(per)}` : "";
    redirect(loginHref(`/profilo/stagione/${season}${qs}`));
  }
  const isStaff = isStaffRole(session?.user?.appRole);

  const [seasonRow, viewer, children] = await Promise.all([
    prisma.season.findUnique({ where: { label: season }, select: { recapPublishedAt: true } }),
    prisma.user.findUnique({
      where: { id: viewerId },
      select: { appRole: true, sportRole: true },
    }),
    prisma.child.findMany({
      where: guardianOf(viewerId),
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, userId: true, user: { select: { name: true } } },
    }),
  ]);
  if (!seasonRow || !viewer) notFound();
  const published = seasonRow.recapPublishedAt != null;

  // I figli fra cui scegliere: la propria scheda figlio (se c'è) è il proprio riepilogo.
  const kids = children.filter((c) => c.userId !== viewerId);
  // Un genitore senza ruolo Baskin apre direttamente il primo figlio.
  const selfFirst = viewer.sportRole != null || viewer.appRole !== "PARENT" || kids.length === 0;

  let subject: RecapSubject | null;
  let relation: "self" | "guardian" | "other";
  if (utente && utente !== viewerId) {
    subject = isStaff ? await loadSelfSubject(utente) : null;
    relation = "other";
  } else if (per) {
    const isKid = kids.some((c) => c.id === per);
    subject = isKid || isStaff ? await loadChildSubject(per) : null;
    relation = isKid ? "guardian" : "other";
    // La propria scheda figlio è il proprio riepilogo.
    if (subject && subject.keys.userId === viewerId) relation = "self";
  } else if (!selfFirst) {
    subject = await loadChildSubject(kids[0].id);
    relation = "guardian";
  } else {
    subject = await loadSelfSubject(viewerId);
    relation = "self";
  }
  if (!subject) notFound();
  if (recapAccess({ published, loggedIn: true, isStaff, relation }) !== "ok") notFound();

  const recap = await loadSeasonRecap(subject.keys, season);
  const self = relation === "self";
  const title = self
    ? t("title", { season })
    : t("titleOther", { season, name: subject.firstName });

  // Scelta "di chi" per chi ha figli: sé (se gioca) e ogni figlio.
  const choices = [
    ...(selfFirst || viewer.sportRole != null
      ? [{ key: "self", label: t("forSelf"), href: recapPath(season) }]
      : []),
    ...kids.map((c) => ({
      key: c.id,
      label: (c.user?.name ?? c.name).split(/\s+/)[0],
      href: recapPath(season, c.id),
    })),
  ];
  const activeKey = self ? "self" : (subject.childId ?? "other");

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Box sx={columnSx("main")}>
        <PageHeader
          title={title}
          subtitle={t("subtitle")}
          breadcrumb={[{ label: t("breadcrumbProfile"), href: "/profilo" }, { label: title }]}
        />
        {!published && (
          <Alert severity="info" sx={{ mb: 3 }}>
            {t("previewBanner")}
          </Alert>
        )}
        {relation !== "other" && choices.length > 1 && (
          <Stack
            component="nav"
            aria-label={t("forWhom")}
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ flexWrap: "wrap", mb: 3 }}
          >
            {choices.map((c) => (
              <Button
                key={c.key}
                href={c.href}
                variant="outlined"
                // Arancio = scelta attiva (UX-29); il bottone pieno resta "Condividi".
                color={c.key === activeKey ? "primary" : "inherit"}
                aria-current={c.key === activeKey ? "page" : undefined}
              >
                {c.label}
              </Button>
            ))}
          </Stack>
        )}
        <SeasonRecapView
          recap={recap}
          self={self}
          name={subject.name}
          firstName={subject.firstName}
          minor={subject.minor}
        />
      </Box>
    </Container>
  );
}
