import { prisma } from "@/lib/db";
import { withDbRetry } from "@/lib/dbRetry";
import { Box, Container, Typography } from "@mui/material";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { heroGradient, heroText } from "@/lib/heroStyles";
import { BRAND } from "@/lib/palette";
import { PUBLIC_PROFILE_SELECT, withProfileLink } from "@/lib/publicProfile";
import { TYPE_SCALE } from "@/lib/typeScale";
import { FONT_WEIGHT } from "@/lib/fontWeight";

export default async function BirthdayBanner() {
  const now = new Date();
  const todayMonth = now.getMonth() + 1;
  const todayDay = now.getDate();

  const [t, users] = await Promise.all([
    getTranslations("home"),
    withDbRetry(() =>
      prisma.user.findMany({
        where: { birthDate: { not: null }, appRole: { not: "GUEST" }, slug: { not: null } },
        select: {
          id: true,
          name: true,
          slug: true,
          birthDate: true,
          sportRole: true,
          ...PUBLIC_PROFILE_SELECT,
        },
      })
    ),
  ]);

  // Anche i genitori ricevono gli auguri, ma senza link se non hanno un
  // profilo pubblico (`slug` null, vedi withProfileLink).
  const celebrants = users
    .filter((u) => {
      const d = new Date(u.birthDate!);
      return d.getMonth() + 1 === todayMonth && d.getDate() === todayDay;
    })
    .map(withProfileLink);

  if (celebrants.length === 0) return null;

  return (
    <Box
      sx={{
        // Fascia scura con un filo arancione del marchio (UX-29): il banner non
        // si tocca, l'arancio pieno diceva "azione" e il bianco sopra si fermava
        // a 3,8:1. I nomi sono link, e come tutti i link sono arancioni.
        background: heroGradient.footer,
        color: heroText.primary,
        borderTop: "3px solid",
        borderColor: "primary.main",
        py: { xs: 1.5, md: 2 },
        px: 2,
      }}
    >
      <Container maxWidth="md">
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            flexWrap: "wrap",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          <Typography sx={{ fontSize: TYPE_SCALE.xl2, lineHeight: 1 }}>🎂</Typography>
          <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold}>
            {celebrants.length === 1 ? (
              <>
                {celebrants[0].slug ? (
                  <Link
                    href={`/giocatori/${celebrants[0].slug}`}
                    style={{
                      color: BRAND.orangeOnDark,
                      textDecoration: "underline",
                      textUnderlineOffset: 3,
                    }}
                  >
                    {celebrants[0].name}
                  </Link>
                ) : (
                  celebrants[0].name
                )}{" "}
                {t("birthdaySingular", { name: "" }).replace(/^\s*/, "")}
              </>
            ) : (
              <>
                {t("birthdayPlural")}{" "}
                {celebrants.map((c, i) => (
                  <span key={c.id}>
                    {i > 0 && (i === celebrants.length - 1 ? " e " : ", ")}
                    {c.slug ? (
                      <Link
                        href={`/giocatori/${c.slug}`}
                        style={{
                          color: BRAND.orangeOnDark,
                          textDecoration: "underline",
                          textUnderlineOffset: 3,
                        }}
                      >
                        {c.name}
                      </Link>
                    ) : (
                      c.name
                    )}
                  </span>
                ))}
              </>
            )}
            {"! "}
            {t("birthdayWish")} 🎉
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
