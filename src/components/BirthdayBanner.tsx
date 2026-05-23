import { prisma } from "@/lib/db";
import { Box, Container, Typography } from "@mui/material";
import Link from "next/link";

export default async function BirthdayBanner() {
  const now = new Date();
  const todayMonth = now.getMonth() + 1;
  const todayDay = now.getDate();

  const users = await prisma.user.findMany({
    where: { birthDate: { not: null }, appRole: { not: "GUEST" }, slug: { not: null } },
    select: { name: true, slug: true, birthDate: true },
  });

  const celebrants = users.filter((u) => {
    const d = new Date(u.birthDate!);
    return d.getMonth() + 1 === todayMonth && d.getDate() === todayDay;
  });

  if (celebrants.length === 0) return null;

  return (
    <Box
      sx={{
        background: "linear-gradient(90deg, #E65100 0%, #FF8F00 100%)",
        color: "#fff",
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
            {celebrants.length === 1 ? "Oggi compie gli anni" : "Oggi festeggiano"}{" "}
            {celebrants.map((c, i) => (
              <span key={c.slug}>
                {i > 0 && (i === celebrants.length - 1 ? " e " : ", ")}
                {c.slug ? (
                  <Link
                    href={`/giocatori/${c.slug}`}
                    style={{ color: "#fff", textDecoration: "underline", textUnderlineOffset: 3 }}
                  >
                    {c.name}
                  </Link>
                ) : (
                  c.name
                )}
              </span>
            ))}
            {"! Fai gli auguri 🎉"}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
