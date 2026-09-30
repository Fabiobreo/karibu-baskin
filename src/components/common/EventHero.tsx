import { getTranslations } from "next-intl/server";
import { Link as MuiLink } from "@mui/material";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PlaceIcon from "@mui/icons-material/Place";
import ShareSection from "@/components/common/ShareSection";
import StatusPill from "@/components/common/StatusPill";
import StaffManageButton from "@/components/common/StaffManageButton";
import EntityHero, { HeroMeta } from "@/components/common/EntityHero";
import { formatRome, isSameRomeDay } from "@/lib/dateUtils";
import { getDateFnsLocale } from "@/lib/dateLocale";
import { eventStatus, isAllDay, type EventStatus } from "@/lib/events";
import { mapsSearchUrl } from "@/lib/clubVenue";
import { SITE_URL } from "@/lib/siteUrl";

type StatusPillVariant = "inverted" | "outlined" | "muted";

interface EventHeroProps {
  event: {
    id: string;
    slug: string | null;
    title: string;
    date: Date;
    endDate: Date | null;
    location: string | null;
  };
  isStaff: boolean;
  locale: string;
}

/**
 * Stati temporali (UX-29): nessuna tinta. "In corso" e "Oggi" sono la pillola
 * invertita (In corso col pallino pulsante), il futuro e' contornato, il
 * passato smorzato. La parola e' sempre il primo segnale.
 */
const STATUS_PILL: Record<EventStatus["kind"], { variant: StatusPillVariant; pulse?: boolean }> = {
  live: { variant: "inverted", pulse: true },
  today: { variant: "inverted" },
  tomorrow: { variant: "outlined" },
  daysAway: { variant: "outlined" },
  ended: { variant: "muted" },
};

/**
 * Hero del dettaglio evento: l'entity hero comune (UX-32) con breadcrumb,
 * "Gestisci" per lo staff, titolo, stato, data/ora/luogo e condivisione.
 *
 * Server Component: niente `sx` a funzione, i colori su fondo scuro vengono da
 * `heroText`.
 */
export default async function EventHero({ event: ev, isStaff, locale }: EventHeroProps) {
  const [tNav, t, tTrainings, tCommon] = await Promise.all([
    getTranslations("nav"),
    getTranslations("events"),
    getTranslations("trainings"),
    getTranslations("common"),
  ]);
  const dl = getDateFnsLocale(locale);

  const status = eventStatus(ev);
  const statusLabel =
    status.kind === "live"
      ? tTrainings("live")
      : status.kind === "ended"
        ? tTrainings("ended")
        : status.kind === "today"
          ? tTrainings("todayBang")
          : status.kind === "tomorrow"
            ? tCommon("tomorrow")
            : tCommon("daysAway", { count: status.days });

  const multiDay = !!ev.endDate && !isSameRomeDay(ev.endDate, ev.date);
  const dateLabel = multiDay
    ? `${formatRome(ev.date, "d MMM", { locale: dl })} – ${formatRome(ev.endDate!, "d MMM yyyy", { locale: dl })}`
    : formatRome(ev.date, "EEEE d MMMM yyyy", { locale: dl });
  // A giornata intera (creato dal calendario) non c'e' un orario da mostrare.
  const showEndTime = !multiDay && !!ev.endDate && !isAllDay(ev.endDate);
  const timeLabel = isAllDay(ev.date)
    ? null
    : `${formatRome(ev.date, "HH:mm")}${showEndTime ? `–${formatRome(ev.endDate!, "HH:mm")}` : ""}`;

  const eventUrl = `${SITE_URL}/eventi/${ev.slug ?? ev.id}`;
  const statusPill = STATUS_PILL[status.kind];

  return (
    <EntityHero
      breadcrumb={[{ label: tNav("events"), href: "/eventi" }, { label: ev.title }]}
      title={ev.title}
      manage={
        // Una sola strada per gestire l'evento: l'admin (UX-23).
        isStaff && <StaffManageButton href={`/admin/eventi?edit=${ev.id}`} label={t("manage")} />
      }
      badges={
        <StatusPill
          label={statusLabel}
          variant={statusPill.variant}
          pulse={statusPill.pulse}
          onDark
        />
      }
      meta={
        <>
          <HeroMeta icon={<CalendarTodayIcon />}>{dateLabel}</HeroMeta>
          {timeLabel && <HeroMeta icon={<AccessTimeIcon />}>{timeLabel}</HeroMeta>}
          {/* Link a Google Maps, non una mappa incorporata: niente cookie. */}
          {ev.location && (
            <HeroMeta icon={<PlaceIcon />}>
              <MuiLink
                href={mapsSearchUrl(ev.location)}
                target="_blank"
                rel="noopener noreferrer"
                color="inherit"
                underline="always"
                aria-label={t("locationMap", { place: ev.location })}
              >
                {ev.location}
              </MuiLink>
            </HeroMeta>
          )}
        </>
      }
      actions={<ShareSection title={ev.title} url={eventUrl} kind="event" dark />}
    />
  );
}
