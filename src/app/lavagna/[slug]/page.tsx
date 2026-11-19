import { notFound } from "next/navigation";
import { Box, Container, Link as MuiLink, Typography } from "@mui/material";
import CategoryIcon from "@mui/icons-material/CategoryOutlined";
import CropFreeIcon from "@mui/icons-material/CropFree";
import TimerIcon from "@mui/icons-material/TimerOutlined";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import { getLocale, getTranslations } from "next-intl/server";
import EntityHero, { HeroMeta } from "@/components/common/EntityHero";
import MembersOnlyNotice from "@/components/common/MembersOnlyNotice";
import StaffManageButton from "@/components/common/StaffManageButton";
import PreviewChip from "@/components/games/PreviewChip";
import DrillPlayer from "@/components/board/DrillPlayer";
import { auth } from "@/lib/authjs";
import { boardViewer, loadBoardDrill } from "@/lib/board/loadBoard";
import { getDateFnsLocale } from "@/lib/dateLocale";
import { formatRome } from "@/lib/dateUtils";
import { columnSx } from "@/lib/layout";
import { buildMetadata } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

// Il titolo di uno schema non e' un segreto, ma la pagina e' dei tesserati:
// niente Google, niente sitemap.
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return buildMetadata({
    title: "Lavagna",
    description: "Uno schema della lavagna del Karibu Baskin, per atleti, famiglie e staff.",
    path: `/lavagna/${slug}`,
    noindex: true,
  });
}

/**
 * Uno schema della lavagna (UX-72): il visore, la descrizione e gli
 * allenamenti in cui lo abbiamo fatto. Qui solo ruoli, nessun nome: i nomi
 * arrivano nella pagina dell'allenamento.
 */
export default async function LavagnaDrillPage({ params }: Props) {
  const [{ slug }, session, t, locale] = await Promise.all([
    params,
    auth(),
    getTranslations("board"),
    getLocale(),
  ]);
  const viewer = boardViewer(session?.user?.appRole, !!session?.user);
  const breadcrumbRoot = { label: t("title"), href: "/lavagna" };

  if (viewer === "anonymous" || viewer === "guest") {
    return (
      <>
        <EntityHero breadcrumb={[breadcrumbRoot]} title={t("title")} />
        <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
          <Box sx={columnSx("main")}>
            <MembersOnlyNotice viewer={viewer} what="board" variant="block" />
          </Box>
        </Container>
      </>
    );
  }

  // Il controllo prima di qualunque Suspense: un 404 vero, non un soft 404.
  const page = await loadBoardDrill(slug, viewer === "staff");
  if (!page) notFound();
  const { drill, preview, trainings } = page;
  const dateLocale = getDateFnsLocale(locale);

  return (
    <>
      <EntityHero
        breadcrumb={[breadcrumbRoot, { label: drill.title }]}
        title={drill.title}
        badges={preview ? <PreviewChip label={t("preview")} /> : undefined}
        manage={
          viewer === "staff" && (
            <StaffManageButton href={`/admin/lavagna/${drill.id}`} label={t("manage")} />
          )
        }
        meta={
          <>
            <HeroMeta icon={<CategoryIcon />}>{t(`kinds.${drill.kind}`)}</HeroMeta>
            <HeroMeta icon={<CropFreeIcon />}>{t(`courts.${drill.court}`)}</HeroMeta>
            {drill.durationMin && (
              <HeroMeta icon={<TimerIcon />}>{t("minutes", { n: drill.durationMin })}</HeroMeta>
            )}
            <HeroMeta icon={<FormatListNumberedIcon />}>
              {t("steps", { n: drill.content.steps.length })}
            </HeroMeta>
          </>
        }
      />
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Box sx={columnSx("main")}>
          {drill.description && (
            <Typography variant="body1" sx={{ mb: 3, whiteSpace: "pre-line" }}>
              {drill.description}
            </Typography>
          )}
          <DrillPlayer title={drill.title} court={drill.court} content={drill.content} />

          {trainings.length > 0 && (
            <Box component="section" sx={{ mt: 5 }}>
              <Typography variant="h4" component="h2" sx={{ mb: 1 }}>
                {t("usedIn")}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {t("usedInText")}
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 3, display: "grid", gap: 0.75 }}>
                {trainings.map((tr) => (
                  <li key={tr.id}>
                    <MuiLink href={tr.href}>
                      {formatRome(tr.date, "EEEE d MMMM yyyy", { locale: dateLocale })}
                    </MuiLink>
                    {" · "}
                    {tr.title}
                  </li>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Container>
    </>
  );
}
