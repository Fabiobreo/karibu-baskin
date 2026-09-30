import { Container, Box, Typography, Paper, Chip, IconButton, Tooltip } from "@mui/material";
import { alpha } from "@mui/material/styles";
import SettingsIcon from "@mui/icons-material/Settings";
import PlaceIcon from "@mui/icons-material/Place";
import EventIcon from "@mui/icons-material/Event";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { getDateFnsLocale } from "@/lib/dateLocale";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { hasRole } from "@/lib/authRoles";
import { brandColor } from "@/lib/heroStyles";
import { TOUCH_TARGET_MIN } from "@/lib/touchTarget";
import PageHero from "@/components/common/PageHero";
import StaffManageButton from "@/components/common/StaffManageButton";
import EmptyState from "@/components/common/EmptyState";
import CoverFallback from "@/components/common/CoverFallback";
import { splitEventsByTime } from "@/lib/events";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { onHover } from "@/lib/hoverStyles";
import { TYPE_SCALE } from "@/lib/typeScale";
import { formatRome, isSameRomeDay } from "@/lib/dateUtils";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";

export const metadata: Metadata = buildMetadata({
  title: "Eventi",
  description: "Tornei, trasferte, feste e appuntamenti del Karibu Baskin di Montecchio Maggiore.",
  path: "/eventi",
});

export const revalidate = 300;

type EventRow = {
  id: string;
  slug: string | null;
  title: string;
  date: Date;
  endDate: Date | null;
  location: string | null;
  imageUrl: string | null;
};

function EventCard({
  ev,
  locale,
  manageLabel,
}: {
  ev: EventRow;
  locale: string;
  /** Solo per lo staff: etichetta dell'ingranaggio verso l'admin. */
  manageLabel?: string;
}) {
  const dl = getDateFnsLocale(locale);
  const multiDay = ev.endDate && !isSameRomeDay(ev.endDate, ev.date);
  const dateLabel = multiDay
    ? `${formatRome(ev.date, "d MMM", { locale: dl })} – ${formatRome(ev.endDate!, "d MMM yyyy", { locale: dl })}`
    : formatRome(ev.date, "EEE d MMM yyyy · HH:mm", { locale: dl });

  return (
    // L'ingranaggio sta fuori dal link della card, non dentro: un link dentro
    // un link non e' HTML valido. Si sovrappone alla copertina.
    <Box sx={{ position: "relative", height: "100%" }}>
      <Link
        href={`/eventi/${ev.slug ?? ev.id}`}
        style={{ textDecoration: "none", display: "block", height: "100%" }}
      >
        <Paper
          elevation={0}
          variant="outlined"
          sx={{
            overflow: "hidden",
            borderRadius: RADIUS.lg,
            height: "100%",
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
            ...onHover({ transform: "translateY(-3px)", boxShadow: 4 }),
          }}
        >
          <Box sx={{ position: "relative", aspectRatio: "16 / 9", overflow: "hidden" }}>
            {ev.imageUrl ? (
              <Box
                component="img"
                src={ev.imageUrl}
                alt={ev.title}
                sx={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <CoverFallback
                weekday={formatRome(ev.date, "EEEE", { locale: dl })}
                day={formatRome(ev.date, "d", { locale: dl })}
                month={formatRome(ev.date, "MMMM yyyy", { locale: dl })}
              />
            )}
          </Box>
          <Box sx={{ p: 2 }}>
            <Chip
              label={dateLabel}
              size="small"
              variant="outlined"
              sx={{ fontSize: TYPE_SCALE.xs, mb: 1 }}
            />
            <Typography
              variant="subtitle1"
              component="h3"
              fontWeight={FONT_WEIGHT.bold}
              sx={{ color: "text.primary", lineHeight: 1.25 }}
            >
              {ev.title}
            </Typography>
            {ev.location && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.75 }}>
                <PlaceIcon sx={{ fontSize: 15, color: "text.secondary" }} />
                <Typography variant="caption" color="text.secondary" noWrap>
                  {ev.location}
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>
      </Link>
      {manageLabel && (
        <Tooltip title={manageLabel}>
          <IconButton
            href={`/admin/eventi?edit=${ev.id}`}
            aria-label={manageLabel}
            size="small"
            sx={{
              ...TOUCH_TARGET_MIN,
              position: "absolute",
              top: 8,
              right: 8,
              // Sopra una foto qualunque: fondo scuro velato per il contrasto.
              color: "common.white",
              bgcolor: alpha(brandColor.black, 0.55),
              backdropFilter: "blur(4px)",
              "&:hover": { bgcolor: alpha(brandColor.black, 0.75) },
            }}
          >
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}

function EventSection({
  title,
  rows,
  locale,
  manageLabel,
}: {
  title: string;
  rows: EventRow[];
  locale: string;
  manageLabel?: (title: string) => string;
}) {
  if (rows.length === 0) return null;
  return (
    <Box sx={{ mb: 5 }}>
      <Typography
        variant="overline"
        component="h2"
        color="text.secondary"
        sx={{ mb: 1.5, display: "block" }}
      >
        {title}
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
          gap: 2,
        }}
      >
        {rows.map((ev) => (
          <EventCard key={ev.id} ev={ev} locale={locale} manageLabel={manageLabel?.(ev.title)} />
        ))}
      </Box>
    </Box>
  );
}

export default async function EventiPage() {
  const [t, locale, session, events] = await Promise.all([
    getTranslations("events"),
    getLocale(),
    auth(),
    prisma.event.findMany({
      orderBy: { date: "asc" },
      select: {
        id: true,
        slug: true,
        title: true,
        date: true,
        endDate: true,
        location: true,
        imageUrl: true,
      },
    }),
  ]);

  // Lo staff gestisce gli eventi dall'admin, come gli allenamenti (UX-14):
  // qui solo i collegamenti.
  const isStaff = !!session?.user?.appRole && hasRole(session.user.appRole, "COACH");
  const manageLabel = isStaff ? (title: string) => t("manageOne", { title }) : undefined;

  const { upcoming, past } = splitEventsByTime(events);

  return (
    <>
      <PageHero
        title={t("heroTitle")}
        subtitle={t("heroSubtitle")}
        maxWidth="lg"
        action={isStaff && <StaffManageButton href="/admin/eventi" label={t("manageAll")} />}
      />
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        {events.length === 0 ? (
          <EmptyState
            icon={<EventIcon sx={{ fontSize: 56, color: "text.secondary" }} />}
            title={t("empty")}
          />
        ) : (
          <>
            <EventSection
              title={t("upcoming")}
              rows={upcoming}
              locale={locale}
              manageLabel={manageLabel}
            />
            <EventSection title={t("past")} rows={past} locale={locale} manageLabel={manageLabel} />
          </>
        )}
      </Container>
    </>
  );
}
