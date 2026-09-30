import { notFound } from "next/navigation";
import { Container, Box, Typography, Stack } from "@mui/material";
import { getTranslations, getLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import JsonLd from "@/components/common/JsonLd";
import EventHero from "@/components/common/EventHero";
import { eventJsonLd } from "@/lib/structuredData";
import { auth } from "@/lib/authjs";
import { hasRole } from "@/lib/authRoles";
import EventPoster from "@/components/common/EventPoster";
import EventRsvp from "@/components/common/EventRsvp";
import { isEventPast } from "@/lib/events";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { loadFamily } from "@/lib/eventFamily";
import { loadFamilyRsvp } from "@/lib/eventRsvp";

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
      allowGuests: true,
      maxGuests: true,
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
  const [locale, ev, session] = await Promise.all([getLocale(), findEvent(slug), auth()]);
  if (!ev) notFound();

  const isStaff = !!session?.user?.appRole && hasRole(session.user.appRole, "COACH");
  const isPast = isEventPast(ev);

  // RSVP: la famiglia di chi guarda (risponde uno per tutti) e i suoi esterni.
  // La famiglia serve prima delle risposte, ma il conteggio parte subito.
  const userId = session?.user?.id ?? null;
  const optionIds = ev.options.map((o) => o.id);
  const [family, going] = await Promise.all([
    userId ? loadFamily(userId) : [],
    prisma.eventAttendance.count({ where: { eventId: ev.id, status: "GOING" } }),
  ]);
  const rsvp = userId
    ? await loadFamilyRsvp(ev.id, userId, family, optionIds)
    : { members: [], guests: [] };

  const optionsView = ev.options.map((o) => ({
    id: o.id,
    label: o.label,
    startsAt: o.startsAt ? o.startsAt.toISOString() : null,
    kind: o.kind as string,
  }));

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
      <EventHero
        event={{
          id: ev.id,
          slug: ev.slug,
          title: ev.title,
          date: ev.date,
          endDate: ev.endDate,
          location: ev.location,
        }}
        isStaff={isStaff}
        locale={locale}
      />

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
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
              // La descrizione e' il contenuto dell'evento, non una nota: testo
              // pieno, non il grigio secondario che la faceva sembrare staccata.
              <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
                {ev.description}
              </Typography>
            )}

            <EventRsvp
              eventId={ev.id}
              isLoggedIn={!!userId}
              isPast={isPast}
              members={rsvp.members}
              guests={rsvp.guests}
              options={optionsView}
              allowGuests={ev.allowGuests}
              maxGuests={ev.maxGuests}
              initialGoing={going}
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
