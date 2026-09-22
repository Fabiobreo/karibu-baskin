import { prisma } from "@/lib/db";
import { withDbRetry } from "@/lib/dbRetry";
import { Box, Container, Typography } from "@mui/material";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { heroGradient } from "@/lib/heroStyles";
import { PUBLIC_PROFILE_SELECT, withProfileLink } from "@/lib/publicProfile";

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
        background: heroGradient.orange,
        color: "common.white",
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
          <Typography sx={{ fontSize: "1.4rem", lineHeight: 1 }}>🎂</Typography>
          <Typography variant="body2" fontWeight={700}>
            {celebrants.length === 1 ? (
              <>
                {celebrants[0].slug ? (
                  <Link
                    href={`/giocatori/${celebrants[0].slug}`}
                    style={{ color: "#fff", textDecoration: "underline", textUnderlineOffset: 3 }}
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
                          color: "#fff",
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
