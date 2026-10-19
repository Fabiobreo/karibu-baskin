import { auth } from "@/lib/authjs";
import { getLocale, getTranslations } from "next-intl/server";
import { Box, Button, Container, Paper, Typography } from "@mui/material";
import { format } from "date-fns";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { columnSx } from "@/lib/layout";
import PageHeader from "@/components/common/PageHeader";
import { loginHref } from "@/lib/loginReturn";
import { getDateFnsLocale } from "@/lib/dateLocale";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { RADIUS } from "@/lib/radius";
import { loadMySuggestions } from "@/lib/suggestions/mySuggestions";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "I miei suggerimenti",
  description: "I suggerimenti che hai mandato e le risposte dello staff.",
  path: "/profilo/suggerimenti",
  noindex: true,
});

export const revalidate = 0;

const CATEGORY_KEYS = {
  APP: "catApp",
  ALLENAMENTI: "catTrainings",
  PARTITE_EVENTI: "catMatches",
  ALTRO: "catOther",
} as const;

export default async function MieiSuggerimentiPage() {
  const session = await auth();
  if (!session?.user?.id) redirect(loginHref("/profilo/suggerimenti"));

  const [suggestions, t, tSuggestion, locale] = await Promise.all([
    loadMySuggestions(session.user.id),
    getTranslations("profile"),
    getTranslations("suggestion"),
    getLocale(),
  ]);
  const dateLocale = getDateFnsLocale(locale);
  const fmt = (d: Date) => format(d, "d MMM yyyy, HH:mm", { locale: dateLocale });

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Box sx={columnSx("main")}>
        <PageHeader
          title={t("mySuggestions")}
          subtitle={t("mySuggestionsSubtitle")}
          breadcrumb={[{ label: t("title"), href: "/profilo" }, { label: t("mySuggestions") }]}
        />

        {suggestions.length === 0 ? (
          <Paper
            variant="outlined"
            sx={{
              p: 4,
              borderRadius: RADIUS.lg,
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Typography color="text.secondary">{t("mySuggestionsEmpty")}</Typography>
            <Button href="/contatti#suggerimenti" variant="outlined">
              {t("mySuggestionsSend")}
            </Button>
          </Paper>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {suggestions.map((s) => (
              <Paper
                key={s.id}
                id={`s-${s.id}`}
                variant="outlined"
                sx={{
                  p: 2.5,
                  borderRadius: RADIUS.lg,
                  scrollMarginTop: 80,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.5,
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {fmt(s.createdAt)} · {tSuggestion(CATEGORY_KEYS[s.category])}
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
                  {s.message}
                </Typography>
                {s.notes.length > 0 ? (
                  s.notes.map((n) => (
                    <Box
                      key={n.id}
                      sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: RADIUS.md,
                        p: 1.5,
                      }}
                    >
                      <Box
                        sx={{ display: "flex", gap: 1, alignItems: "baseline", flexWrap: "wrap" }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: FONT_WEIGHT.semibold }}>
                          {t("mySuggestionsStaff")}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {fmt(n.createdAt)}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", mt: 0.5 }}>
                        {n.body}
                      </Typography>
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {t("mySuggestionsNoReply")}
                  </Typography>
                )}
              </Paper>
            ))}
          </Box>
        )}

        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 3 }}>
          {t("mySuggestionsAnonymous")}
        </Typography>
      </Box>
    </Container>
  );
}
