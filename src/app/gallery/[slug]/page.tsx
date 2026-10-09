import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Box, Breadcrumbs, Button, Container, Link as MuiLink, Typography } from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { hasRole, isMemberRole } from "@/lib/authRoles";
import { buildMetadata } from "@/lib/seo";
import { heroText } from "@/lib/heroStyles";
import { loginHref } from "@/lib/loginReturn";
import { canSeeAlbum, LISTED_ALBUM_WHERE } from "@/lib/gallery/albumRules";
import { driveFolderUrl } from "@/lib/gallery/drive";
import PageHero from "@/components/common/PageHero";
import EmptyState from "@/components/common/EmptyState";
import StaffManageButton from "@/components/common/StaffManageButton";
import AlbumPhotoGrid from "@/components/gallery/AlbumPhotoGrid";
import AlbumPagination from "@/components/gallery/AlbumPagination";
import {
  ALBUM_PAGE_SIZE,
  albumPageCount,
  albumPageHref,
  parseAlbumPage,
} from "@/lib/gallery/albumPages";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ pagina?: string | string[] }>;
}

/** L'album come esiste per il pubblico: raggiungibile e con almeno una foto visibile. */
function findAlbum(slug: string) {
  return prisma.photoAlbum.findFirst({
    where: { slug, ...LISTED_ALBUM_WHERE },
    select: {
      id: true,
      slug: true,
      title: true,
      date: true,
      visibility: true,
      photoCount: true,
      otherFiles: true,
      driveFolderId: true,
      event: { select: { id: true, slug: true, title: true } },
      match: {
        select: {
          id: true,
          slug: true,
          team: { select: { name: true } },
          opponent: { select: { name: true } },
          opponentTeam: { select: { name: true } },
        },
      },
    },
  });
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ slug }, { pagina }] = await Promise.all([params, searchParams]);
  const [album, t] = await Promise.all([findAlbum(slug), getTranslations("pages")]);
  if (!album) {
    return buildMetadata({
      title: t("gallery.albumNotFound"),
      description: t("gallery.albumNotFoundDesc"),
      path: `/gallery/${slug}`,
      noindex: true,
    });
  }
  // Ogni pagina dell'album ha il suo indirizzo e il suo titolo.
  const page = parseAlbumPage(pagina, albumPageCount(album.photoCount));
  return buildMetadata({
    title: page > 1 ? t("gallery.albumPageTitle", { title: album.title, page }) : album.title,
    description: t("gallery.albumDescription", { title: album.title }),
    path: albumPageHref(album.slug, page),
    // Un album riservato non si fa trovare dai motori di ricerca.
    noindex: album.visibility !== "PUBLIC",
  });
}

export default async function AlbumPage({ params, searchParams }: Props) {
  const [{ slug }, { pagina }] = await Promise.all([params, searchParams]);
  const [album, session, t, locale] = await Promise.all([
    findAlbum(slug),
    auth(),
    getTranslations("pages"),
    getLocale(),
  ]);
  if (!album) notFound();

  const role = session?.user?.appRole;
  const canSee = canSeeAlbum(album.visibility, isMemberRole(role));
  const isStaff = !!role && hasRole(role, "COACH");

  // Le foto si leggono solo per chi le può vedere: per gli altri non entrano
  // nemmeno nel payload della pagina.
  const photos = canSee
    ? await prisma.albumPhoto.findMany({
        where: { albumId: album.id, hidden: false },
        orderBy: { position: "asc" },
        select: { id: true, driveFileId: true, width: true, height: true },
      })
    : [];

  // Si disegna una pagina da 60; il lightbox riceve l'elenco di tutti i file
  // (poche decine di byte a foto) e le scorre tutte.
  const pages = albumPageCount(photos.length);
  const page = parseAlbumPage(pagina, pages);
  const offset = (page - 1) * ALBUM_PAGE_SIZE;
  const pagePhotos = photos.slice(offset, offset + ALBUM_PAGE_SIZE);

  const dateLabel = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Rome",
  }).format(album.date);

  const linked = album.event
    ? {
        href: `/eventi/${album.event.slug ?? album.event.id}`,
        label: t("gallery.albumLinkedEvent", { title: album.event.title }),
      }
    : album.match
      ? {
          href: `/partite/${album.match.slug ?? album.match.id}`,
          label: t("gallery.albumLinkedMatch", {
            title: `${album.match.team.name} - ${
              album.match.opponent?.name ?? album.match.opponentTeam?.name ?? ""
            }`,
          }),
        }
      : null;

  return (
    <>
      <PageHero
        title={album.title}
        subtitle={
          canSee
            ? `${dateLabel} · ${t("gallery.albumCount", { count: album.photoCount })}`
            : dateLabel
        }
        breadcrumb={
          <Breadcrumbs
            aria-label="breadcrumb"
            sx={{ "& .MuiBreadcrumbs-separator": { color: heroText.muted } }}
          >
            <MuiLink
              href="/gallery"
              underline="hover"
              variant="body2"
              sx={{ color: heroText.muted, "&:hover": { color: "common.white" } }}
            >
              {t("gallery.albumBreadcrumb")}
            </MuiLink>
            <Typography variant="body2" sx={{ color: heroText.secondary }}>
              {album.title}
            </Typography>
          </Breadcrumbs>
        }
        action={
          (canSee || isStaff) && (
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {canSee && (
                <Button
                  href={driveFolderUrl(album.driveFolderId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outlined"
                  color="inherit"
                  startIcon={<OpenInNewIcon />}
                  sx={{ color: "common.white" }}
                >
                  {t("gallery.albumDownloadAll")}
                </Button>
              )}
              {isStaff && (
                <StaffManageButton
                  href={`/admin/gallery?album=${album.id}`}
                  label={t("gallery.albumManage")}
                />
              )}
            </Box>
          )
        }
      />

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        {!canSee ? (
          <EmptyState
            icon={<LockOutlinedIcon sx={{ fontSize: 48, color: "text.secondary" }} />}
            title={t("gallery.albumLockedTitle")}
            message={session?.user ? t("gallery.albumLockedGuest") : t("gallery.albumLockedAnon")}
            action={
              session?.user ? undefined : (
                <Button size="large" variant="contained" href={loginHref(`/gallery/${album.slug}`)}>
                  {t("gallery.albumsLogin")}
                </Button>
              )
            }
          />
        ) : (
          <>
            {linked && (
              <Typography variant="body2" sx={{ mb: 2 }}>
                <MuiLink href={linked.href}>{linked.label}</MuiLink>
              </Typography>
            )}
            <AlbumPhotoGrid
              slug={album.slug}
              title={album.title}
              photos={pagePhotos}
              offset={offset}
              allFileIds={photos.map((p) => p.driveFileId)}
            />
            <AlbumPagination
              slug={album.slug}
              page={page}
              pages={pages}
              labels={{
                nav: t("gallery.albumPagesNav"),
                prev: t("gallery.albumPrevPage"),
                next: t("gallery.albumNextPage"),
                position: t("gallery.albumPageOf", { page, pages }),
              }}
            />
            {album.otherFiles > 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
                {t("gallery.albumOtherFiles", { count: album.otherFiles })}{" "}
                <MuiLink
                  href={driveFolderUrl(album.driveFolderId)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("gallery.albumOpenDrive")}
                </MuiLink>
              </Typography>
            )}
          </>
        )}
      </Container>
    </>
  );
}
