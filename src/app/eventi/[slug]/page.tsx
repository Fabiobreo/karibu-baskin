import { notFound } from "next/navigation";
import { Container, Box, Typography, Chip, Stack, Button } from "@mui/material";
import PlaceIcon from "@mui/icons-material/Place";
import EventIcon from "@mui/icons-material/Event";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { format } from "date-fns";
import { getDateFnsLocale } from "@/lib/dateLocale";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import EventRsvp, { type EventRsvpSubject } from "@/components/common/EventRsvp";
import { isEventPast } from "@/lib/events";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

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
  const [t, locale, ev] = await Promise.all([
    getTranslations("events"),
    getLocale(),
    findEvent(slug),
  ]);
  if (!ev) notFound();

  const dl = getDateFnsLocale(locale);
  const multiDay = ev.endDate && ev.endDate.toDateString() !== ev.date.toDateString();
  const dateLabel = multiDay
    ? `${format(ev.date, "d MMM yyyy", { locale: dl })} – ${format(ev.endDate!, "d MMM yyyy", { locale: dl })}`
    : format(ev.date, "EEEE d MMMM yyyy · HH:mm", { locale: dl });
  const isPast = isEventPast(ev);

  // Sessione + figli per il RSVP
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const children = userId
    ? await prisma.child.findMany({
        where: { parentId: userId },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true },
      })
    : [];

  const optionIds = ev.options.map((o) => o.id);

  // Conteggi + risposte proprie (status/note) + selezioni opzioni proprie
  const [grouped, mine, mySelections] = await Promise.all([
    prisma.eventAttendance.groupBy({
      by: ["status"],
      where: { eventId: ev.id },
      _count: { _all: true },
    }),
    userId
      ? prisma.eventAttendance.findMany({
          where: {
            eventId: ev.id,
            OR: [{ userId }, { childId: { in: children.map((c) => c.id) } }],
          },
          select: { userId: true, childId: true, status: true, note: true },
        })
      : [],
    userId && optionIds.length > 0
      ? prisma.eventOptionSelection.findMany({
          where: {
            optionId: { in: optionIds },
            OR: [{ userId }, { childId: { in: children.map((c) => c.id) } }],
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
      {/* Hero copertina */}
      <Box
        sx={{
          position: "relative",
          minHeight: { xs: 200, md: 320 },
          bgcolor: "action.hover",
          display: "flex",
          alignItems: "flex-end",
        }}
      >
        {ev.imageUrl ? (
          <Box
            component="img"
            src={ev.imageUrl}
            alt={ev.title}
            sx={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <EventIcon sx={{ fontSize: 72, color: "text.disabled" }} />
          </Box>
        )}
        <Box
          sx={{
            position: "relative",
            width: "100%",
            background: "linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0))",
            p: { xs: 2.5, md: 4 },
          }}
        >
          <Container maxWidth="md" disableGutters>
            <Chip
              label={dateLabel}
              size="small"
              sx={{
                fontWeight: 700,
                mb: 1,
                bgcolor: "primary.main",
                color: "primary.contrastText",
              }}
            />
            <Typography
              variant="h4"
              fontWeight={900}
              sx={{ color: "common.white", lineHeight: 1.15 }}
            >
              {ev.title}
            </Typography>
          </Container>
        </Box>
      </Box>

      <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
        <Link href="/eventi" style={{ textDecoration: "none" }}>
          <Button size="small" startIcon={<ArrowBackIcon />} sx={{ mb: 2, fontWeight: 600 }}>
            {t("backToList")}
          </Button>
        </Link>

        <Stack spacing={3}>
          {ev.location && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <PlaceIcon sx={{ color: "primary.main" }} />
              <Box>
                <Typography variant="caption" color="text.disabled" sx={{ display: "block" }}>
                  {t("location")}
                </Typography>
                {mapsUrl ? (
                  <Link
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: "none" }}
                  >
                    <Typography variant="body1" fontWeight={600} sx={{ color: "primary.onLight" }}>
                      {ev.location}
                    </Typography>
                  </Link>
                ) : (
                  <Typography variant="body1" fontWeight={600}>
                    {ev.location}
                  </Typography>
                )}
              </Box>
            </Box>
          )}

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
      </Container>
    </>
  );
}
