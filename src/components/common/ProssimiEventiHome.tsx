import Link from "next/link";
import { Box, Container, Paper, Stack, Typography } from "@mui/material";
import EventIcon from "@mui/icons-material/Event";
import PlaceIcon from "@mui/icons-material/Place";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "date-fns";
import { getDateFnsLocale } from "@/lib/dateLocale";
import { formatRome, isSameRomeDay } from "@/lib/dateUtils";
import { isAllDay } from "@/lib/events";
import { loadHomeEvents, type HomeEvent } from "@/lib/homeEvents";
import { onHover } from "@/lib/hoverStyles";
import { TYPE_SCALE } from "@/lib/typeScale";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { RADIUS } from "@/lib/radius";

interface ProssimiEventiHomeProps {
  /** Chi guarda: con l'accesso ogni evento dice se la famiglia ha risposto. */
  userId: string | null;
}

/** "Oggi · 15:00", "sab 18 ott · 15:00", "18 – 20 ott": senza ora se e' a giornata intera. */
function whenLabel(ev: HomeEvent, dl: Locale, today: string, tomorrow: string): string {
  if (ev.endDate && !isSameRomeDay(ev.endDate, ev.date)) {
    return `${formatRome(ev.date, "d MMM", { locale: dl })} – ${formatRome(ev.endDate, "d MMM", { locale: dl })}`;
  }
  const day =
    ev.status.kind === "today"
      ? today
      : ev.status.kind === "tomorrow"
        ? tomorrow
        : formatRome(ev.date, "EEE d MMM", { locale: dl });
  return isAllDay(ev.date) ? day : `${day} · ${formatRome(ev.date, "HH:mm")}`;
}

/**
 * Sezione "Prossimi eventi" della home: gli eventi del prossimo mese, al
 * massimo due, in righe compatte. Solo il primo mostra la copertina, se ne ha
 * una. Senza eventi la sezione non c'e', come quella delle partite.
 */
export default async function ProssimiEventiHome({ userId }: ProssimiEventiHomeProps) {
  const [t, tCommon, locale, events] = await Promise.all([
    getTranslations("events"),
    getTranslations("common"),
    getLocale(),
    loadHomeEvents(userId),
  ]);

  if (events.length === 0) return null;

  const dl = getDateFnsLocale(locale);
  const answerLabel = {
    none: t("toAnswer"),
    partial: t("homeAnswerPartial"),
    answered: t("homeAnswered"),
  };

  return (
    <Box sx={{ py: { xs: 4, md: 6 }, borderTop: "1px solid", borderColor: "divider" }}>
      <Container maxWidth="lg">
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
          {/* Icona decorativa di una sezione chiara: arancio (UX-28, opzione B). */}
          <EventIcon sx={{ color: "primary.main", fontSize: 32 }} />
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1 }}>
              {t("homeChip")}
            </Typography>
            <Typography
              variant="h5"
              component="h2"
              sx={{ mt: 0.25, fontSize: { xs: TYPE_SCALE.xl2, md: TYPE_SCALE.xl2 } }}
            >
              {t("upcoming")}
            </Typography>
          </Box>
        </Box>

        <Stack spacing={1.5}>
          {events.map((ev, idx) => {
            const cover = idx === 0 ? ev.imageUrl : null;
            const answered = ev.answer === "answered";
            return (
              <Link
                key={ev.id}
                href={`/eventi/${ev.slug ?? ev.id}`}
                style={{ textDecoration: "none", display: "block" }}
              >
                <Paper
                  variant="outlined"
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    overflow: "hidden",
                    borderRadius: RADIUS.lg,
                    transition: "border-color 0.15s ease",
                    ...onHover({
                      borderColor: "primary.main",
                      "& [data-arrow]": { color: "primary.main" },
                    }),
                  }}
                >
                  {cover && (
                    <Box
                      sx={{
                        width: { xs: "100%", sm: 260 },
                        aspectRatio: "16 / 9",
                        flexShrink: 0,
                        overflow: "hidden",
                      }}
                    >
                      {/* Decorativa: il titolo e' scritto accanto. */}
                      <Box
                        component="img"
                        src={cover}
                        alt=""
                        sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    </Box>
                  )}

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      p: 2,
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {/* Giorno e mese come su un foglio di calendario: si legge
                        anche scorrendo. La data completa e' nella riga sotto il titolo. */}
                    <Box aria-hidden sx={{ width: 48, flexShrink: 0, textAlign: "center" }}>
                      <Typography variant="h5" component="div" sx={{ lineHeight: 1 }}>
                        {formatRome(ev.date, "d")}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", textTransform: "uppercase", mt: 0.25 }}
                      >
                        {formatRome(ev.date, "MMM", { locale: dl })}
                      </Typography>
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="h6"
                        component="h3"
                        sx={{ color: "text.primary", lineHeight: 1.25, overflowWrap: "anywhere" }}
                      >
                        {ev.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                        {whenLabel(ev, dl, tCommon("today"), tCommon("tomorrow"))}
                      </Typography>
                      {ev.location && (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            mt: 0.25,
                            color: "text.secondary",
                            minWidth: 0,
                          }}
                        >
                          <PlaceIcon sx={{ fontSize: 16, flexShrink: 0 }} />
                          <Typography variant="body2" noWrap>
                            {ev.location}
                          </Typography>
                        </Box>
                      )}
                      {/* Lo stato della risposta e' testo, non un chip che sembra un
                          bottone: si risponde nella pagina dell'evento. */}
                      {ev.answer && (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            mt: 0.75,
                            color: answered ? "text.secondary" : "text.primary",
                          }}
                        >
                          {answered ? (
                            <CheckCircleOutlineIcon sx={{ fontSize: 16 }} />
                          ) : (
                            <RadioButtonUncheckedIcon sx={{ fontSize: 16 }} />
                          )}
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: answered ? FONT_WEIGHT.regular : FONT_WEIGHT.semibold,
                            }}
                          >
                            {answerLabel[ev.answer]}
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    <ChevronRightIcon
                      data-arrow
                      sx={{
                        color: "text.secondary",
                        flexShrink: 0,
                        transition: "color 0.15s ease",
                      }}
                    />
                  </Box>
                </Paper>
              </Link>
            );
          })}
        </Stack>

        <Box sx={{ textAlign: "right", mt: 2 }}>
          <Link href="/eventi" style={{ textDecoration: "none" }}>
            <Typography
              variant="body2"
              color="primary.onLight"
              sx={{ fontWeight: FONT_WEIGHT.semibold, "&:hover": { textDecoration: "underline" } }}
            >
              {t("homeSeeAll")}
            </Typography>
          </Link>
        </Box>
      </Container>
    </Box>
  );
}
