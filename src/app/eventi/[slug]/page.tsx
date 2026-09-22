import { notFound } from "next/navigation";
import { Container, Box, Typography, Stack, Button } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { common } from "@mui/material/colors";
import PlaceIcon from "@mui/icons-material/Place";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { format } from "date-fns";
import { getDateFnsLocale } from "@/lib/dateLocale";
import { prisma } from "@/lib/db";
import JsonLd from "@/components/common/JsonLd";
import { eventJsonLd } from "@/lib/structuredData";
import { auth } from "@/lib/authjs";
import PageHero from "@/components/common/PageHero";
import EventPoster from "@/components/common/EventPoster";
import EventRsvp, { type EventRsvpSubject } from "@/components/common/EventRsvp";
import { isEventPast } from "@/lib/events";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { guardianOf } from "@/lib/guardians";

export const revalidate = 0;

type Props = { params: Promise<{ slug: string }> };

async function findEvent(slug: string) {
  return prisma.event.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    select: {
      id: true,
      slug: true,
      title: true,
      date: true,
      endDate: true,
      location: true,
      description: true,
      imageUrl: true,
      options: {
        orderBy: [{ order: "asc" as const }, { startsAt: "asc" as const }],
        select: { id: true, label: true, startsAt: true, kind: true },
      },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const ev = await findEvent(slug);
  if (!ev) {
    return buildMetadata({
      title: "Evento non trovato",
      description: "Questo evento non esiste o è stato rimosso.",
      path: `/eventi/${slug}`,
      noindex: true,
    });
  }
  return buildMetadata({
    title: ev.title,
    description: ev.description?.slice(0, 160) ?? `${ev.title}, un evento del Karibu Baskin.`,
    path: `/eventi/${ev.slug ?? slug}`,
    type: "article",
    // La copertina dell'evento è un'anteprima migliore della card generica del sito.
    image: ev.imageUrl ?? undefined,
  });
}

export default async function EventoPage({ params }: Props) {
  const { slug } = await params;
  const [t, locale, ev, session] = await Promise.all([
    getTranslations("events"),
    getLocale(),
    findEvent(slug),
    auth(),
  ]);
  if (!ev) notFound();

  const dl = getDateFnsLocale(locale);
  const multiDay = ev.endDate && ev.endDate.toDateString() !== ev.date.toDateString();
  const dateLabel = multiDay
    ? `${format(ev.date, "d MMM yyyy", { locale: dl })} – ${format(ev.endDate!, "d MMM yyyy", { locale: dl })}`
    : format(ev.date, "EEEE d MMMM yyyy · HH:mm", { locale: dl });
  const isPast = isEventPast(ev);

  // Sessione + figli per il RSVP
  const userId = session?.user?.id ?? null;
  const optionIds = ev.options.map((o) => o.id);

  // Figli + conteggi + risposte proprie (status/note) + selezioni opzioni
  // proprie, tutto insieme: le righe dei figli si filtrano sulla relazione
  // (`guardianOf`) invece di aspettare prima la lista dei loro id.
  const [children, grouped, mine, mySelections] = await Promise.all([
    userId
      ? prisma.child.findMany({
          where: guardianOf(userId),
          orderBy: { createdAt: "asc" },
          select: { id: true, name: true },
        })
      : [],
    prisma.eventAttendance.groupBy({
      by: ["status"],
      where: { eventId: ev.id },
      _count: { _all: true },
    }),
    userId
      ? prisma.eventAttendance.findMany({
          where: {
            eventId: ev.id,
            OR: [{ userId }, { child: guardianOf(userId) }],
          },
          select: { userId: true, childId: true, status: true, note: true },
        })
      : [],
    userId && optionIds.length > 0
      ? prisma.eventOptionSelection.findMany({
          where: {
            optionId: { in: optionIds },
            OR: [{ userId }, { child: guardianOf(userId) }],
          },
          select: { optionId: true, userId: true, childId: true },
        })
      : [],
  ]);

  const counts = { GOING: 0, MAYBE: 0, NOT_GOING: 0 };
  for (const g of grouped) counts[g.status] = g._count._all;

  const statusByKey = new Map<string, "GOING" | "MAYBE" | "NOT_GOING">();
  const noteByKey = new Map<string, string | null>();
  for (const a of mine) {
    statusByKey.set(a.childId ?? "self", a.status);
    noteByKey.set(a.childId ?? "self", a.note);
  }
  const selByKey = new Map<string, string[]>();
  for (const s of mySelections) {
    const k = s.childId ?? "self";
    selByKey.set(k, [...(selByKey.get(k) ?? []), s.optionId]);
  }

  const subjects: EventRsvpSubject[] = userId
    ? [
        {
          childId: null,
          name: session!.user!.name ?? t("me"),
          status: statusByKey.get("self"),
          selectedOptionIds: selByKey.get("self") ?? [],
          note: noteByKey.get("self") ?? null,
        },
        ...children.map((c) => ({
          childId: c.id,
          name: c.name,
          status: statusByKey.get(c.id),
          selectedOptionIds: selByKey.get(c.id) ?? [],
          note: noteByKey.get(c.id) ?? null,
        })),
      ]
    : [];

  const optionsView = ev.options.map((o) => ({
    id: o.id,
    label: o.label,
    startsAt: o.startsAt ? o.startsAt.toISOString() : null,
    kind: o.kind as string,
  }));

  const mapsUrl = ev.location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.location)}`
    : null;

  return (
    <>
      <JsonLd
        data={eventJsonLd({
          name: ev.title,
          slug: ev.slug ?? ev.id,
          startDate: ev.date,
          endDate: ev.endDate,
          location: ev.location,
          description: ev.description,
          imageUrl: ev.imageUrl,
        })}
      />
      <PageHero
        title={ev.title}
        chip={dateLabel}
        align="left"
        py={{ xs: 4, md: 6 }}
        decorativeCircles={false}
      >
        {ev.location && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <PlaceIcon sx={{ color: "primary.main", fontSize: 20 }} />
            {mapsUrl ? (
              <Link
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none" }}
              >
                <Typography
                  variant="body1"
                  fontWeight={600}
                  sx={{
                    color: "common.white",
                    textDecoration: "underline",
                    textDecorationColor: alpha(common.white, 0.4),
                    textUnderlineOffset: 3,
                  }}
                >
                  {ev.location}
                </Typography>
              </Link>
            ) : (
              <Typography variant="body1" fontWeight={600} sx={{ color: "common.white" }}>
                {ev.location}
              </Typography>
            )}
          </Box>
        )}
      </PageHero>

      <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
        <Link href="/eventi" style={{ textDecoration: "none" }}>
          <Button size="small" startIcon={<ArrowBackIcon />} sx={{ mb: 2, fontWeight: 600 }}>
            {t("backToList")}
          </Button>
        </Link>

        {/* Con la locandina: due colonne su desktop (contenuto + locandina intera
            che resta visibile scorrendo); su mobile la locandina è una riga
            compatta prima della descrizione. */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              md: ev.imageUrl ? "minmax(0, 1fr) 280px" : "minmax(0, 1fr)",
            },
            gap: { xs: 3, md: 4 },
            alignItems: "start",
          }}
        >
          <Stack spacing={3}>
            {ev.description && (
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ whiteSpace: "pre-wrap", lineHeight: 1.8 }}
              >
                {ev.description}
              </Typography>
            )}

            <EventRsvp
              eventId={ev.id}
              isLoggedIn={!!userId}
              isPast={isPast}
              subjects={subjects}
              options={optionsView}
              initialCounts={counts}
            />
          </Stack>

          {ev.imageUrl && (
            <Box
              component="aside"
              sx={{
                order: { xs: -1, md: 0 },
                position: { md: "sticky" },
                top: { md: 88 },
              }}
            >
              <EventPoster imageUrl={ev.imageUrl} title={ev.title} />
            </Box>
          )}
        </Box>
      </Container>
    </>
  );
}
