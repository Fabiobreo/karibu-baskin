import { getTranslations } from "next-intl/server";
import { Box, Typography, Breadcrumbs, Link as MuiLink } from "@mui/material";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PlaceIcon from "@mui/icons-material/Place";
import ShareSection from "@/components/common/ShareSection";
import StatusPill from "@/components/common/StatusPill";
import StaffManageButton from "@/components/common/StaffManageButton";
import { heroBottomBorder, heroGradient, heroText } from "@/lib/heroStyles";
import { formatRome, isSameRomeDay } from "@/lib/dateUtils";
import { getDateFnsLocale } from "@/lib/dateLocale";
import { eventStatus, isAllDay, type EventStatus } from "@/lib/events";
import { mapsSearchUrl } from "@/lib/clubVenue";
import { SITE_URL } from "@/lib/siteUrl";
import { TYPE_SCALE } from "@/lib/typeScale";

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
 * Hero del dettaglio evento: stessa struttura di `AllenamentoHero` (breadcrumb,
 * "Gestisci" per lo staff, titolo, stato, data/ora/luogo, condivisione), cosi'
 * le due pagine si leggono e si usano allo stesso modo.
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
    <Box
      style={{ backgroundImage: heroGradient.dark }}
      sx={{
        ...heroBottomBorder,
        color: "common.white",
        px: { xs: 2.5, sm: 4, md: 8 },
        py: { xs: 3, sm: 4 },
        position: "relative",
        overflow: "hidden",
      }}
    >
      {isStaff && (
        <Box
          sx={{
            position: "absolute",
            top: { xs: 12, md: 16 },
            right: { xs: 12, md: 20 },
            zIndex: 2,
          }}
        >
          {/* Una sola strada per gestire l'evento: l'admin (UX-23). */}
          <StaffManageButton href={`/admin/eventi?edit=${ev.id}`} label={t("manage")} />
        </Box>
      )}

      {/* Stesso breadcrumb dell'allenamento: una riga sua, l'ultima voce si
          tronca con l'ellissi invece di andare a capo. */}
      <Box
        sx={{
          position: "relative",
          zIndex: 2,
          mb: { xs: 2, md: 2.5 },
          pr: isStaff ? { xs: 14, md: 15 } : 0,
          minWidth: 0,
        }}
      >
        <Breadcrumbs
          aria-label="breadcrumb"
          sx={{
            "& .MuiBreadcrumbs-separator": {
              color: heroText.muted,
              flexShrink: 0,
            },
            "& .MuiBreadcrumbs-ol": { flexWrap: "nowrap" },
            "& .MuiBreadcrumbs-li": { minWidth: 0, overflow: "hidden" },
            "& .MuiBreadcrumbs-li:not(:last-of-type)": { flexShrink: 0 },
          }}
        >
          <MuiLink
            href="/eventi"
            underline="hover"
            variant="body2"
            sx={{
              color: heroText.muted,
              whiteSpace: "nowrap",
              "&:hover": { color: "common.white" },
            }}
          >
            {tNav("events")}
          </MuiLink>
          <Typography variant="body2" sx={{ color: heroText.secondary, minWidth: 0 }} noWrap>
            {ev.title}
          </Typography>
        </Breadcrumbs>
      </Box>

      <Box sx={{ maxWidth: "md", mx: "auto", position: "relative", textAlign: "center" }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{
            lineHeight: 1.15,
            fontSize: { xs: TYPE_SCALE.xl3, sm: TYPE_SCALE.xl4, md: TYPE_SCALE.xl5 },
            mb: 1.5,
          }}
        >
          {ev.title}
        </Typography>

        <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
          <StatusPill
            label={statusLabel}
            variant={statusPill.variant}
            pulse={statusPill.pulse}
            onDark
          />
        </Box>

        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: { xs: 1, sm: 2.5 },
            mb: 2.5,
            opacity: 0.82,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <CalendarTodayIcon sx={{ fontSize: 16 }} />
            <Typography variant="body2">{dateLabel}</Typography>
          </Box>
          {timeLabel && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <AccessTimeIcon sx={{ fontSize: 16 }} />
              <Typography variant="body2">{timeLabel}</Typography>
            </Box>
          )}
          {/* Link a Google Maps, non una mappa incorporata: niente cookie. */}
          {ev.location && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <PlaceIcon sx={{ fontSize: 16 }} />
              <MuiLink
                href={mapsSearchUrl(ev.location)}
                target="_blank"
                rel="noopener noreferrer"
                color="inherit"
                underline="always"
                variant="body2"
                aria-label={t("locationMap", { place: ev.location })}
              >
                {ev.location}
              </MuiLink>
            </Box>
          )}
        </Box>

        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <ShareSection title={ev.title} url={eventUrl} kind="event" dark />
        </Box>
      </Box>
    </Box>
  );
}
