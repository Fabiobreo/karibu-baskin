import { Container, Box, Typography, Paper, Chip } from "@mui/material";
import PlaceIcon from "@mui/icons-material/Place";
import EventIcon from "@mui/icons-material/Event";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { format } from "date-fns";
import { getDateFnsLocale } from "@/lib/dateLocale";
import { prisma } from "@/lib/db";
import PageHero from "@/components/common/PageHero";
import EmptyState from "@/components/common/EmptyState";
import CoverFallback from "@/components/common/CoverFallback";
import { splitEventsByTime } from "@/lib/events";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { onHover } from "@/lib/hoverStyles";
import { TYPE_SCALE } from "@/lib/typeScale";

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

function EventCard({ ev, locale }: { ev: EventRow; locale: string }) {
  const dl = getDateFnsLocale(locale);
  const multiDay = ev.endDate && ev.endDate.toDateString() !== ev.date.toDateString();
  const dateLabel = multiDay
    ? `${format(ev.date, "d MMM", { locale: dl })} – ${format(ev.endDate!, "d MMM yyyy", { locale: dl })}`
    : format(ev.date, "EEE d MMM yyyy · HH:mm", { locale: dl });

  return (
    <Link href={`/eventi/${ev.slug ?? ev.id}`} style={{ textDecoration: "none" }}>
      <Paper
        elevation={0}
        variant="outlined"
        sx={{
          overflow: "hidden",
          borderRadius: 3,
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
              weekday={format(ev.date, "EEEE", { locale: dl })}
              day={format(ev.date, "d", { locale: dl })}
              month={format(ev.date, "MMMM yyyy", { locale: dl })}
            />
          )}
        </Box>
        <Box sx={{ p: 2 }}>
          <Chip
            label={dateLabel}
            size="small"
            variant="outlined"
            sx={{ fontWeight: 700, fontSize: TYPE_SCALE.xs, mb: 1 }}
          />
          <Typography
            variant="subtitle1"
            component="h3"
            fontWeight={800}
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
  );
}

function EventSection({
  title,
  rows,
  locale,
}: {
  title: string;
  rows: EventRow[];
  locale: string;
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
          <EventCard key={ev.id} ev={ev} locale={locale} />
        ))}
      </Box>
    </Box>
  );
}

export default async function EventiPage() {
  const [t, locale] = await Promise.all([getTranslations("events"), getLocale()]);

  const events = await prisma.event.findMany({
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
  });

  const { upcoming, past } = splitEventsByTime(events);

  return (
    <>
      <PageHero title={t("heroTitle")} subtitle={t("heroSubtitle")} subtitleMaxWidth={520} />
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        {events.length === 0 ? (
          <EmptyState
            icon={<EventIcon sx={{ fontSize: 56, color: "text.secondary" }} />}
            title={t("empty")}
          />
        ) : (
          <>
            <EventSection title={t("upcoming")} rows={upcoming} locale={locale} />
            <EventSection title={t("past")} rows={past} locale={locale} />
          </>
        )}
      </Container>
    </>
  );
}
