import { getTranslations } from "next-intl/server";
import { Box, Button, Paper, Typography } from "@mui/material";
import CelebrationIcon from "@mui/icons-material/Celebration";
import { RADIUS } from "@/lib/radius";
import { loadRecapLinks } from "@/lib/season/loadSeasonRecap";
import { recapPath } from "@/lib/season/recapPaths";

interface SeasonRecapLinksProps {
  userId: string;
}

/**
 * "Le tue stagioni" nel profilo (UX-60): i riepiloghi pubblicati in cui chi
 * guarda, o un suo figlio, ha dei dati. Senza riepiloghi non c'è.
 */
export default async function SeasonRecapLinks({ userId }: SeasonRecapLinksProps) {
  const [t, seasons] = await Promise.all([getTranslations("seasonRecap"), loadRecapLinks(userId)]);
  if (seasons.length === 0) return null;

  return (
    <Paper
      component="section"
      aria-labelledby="season-recap-links"
      variant="outlined"
      sx={{ borderRadius: RADIUS.lg, p: { xs: 2.5, md: 3 }, mb: 3 }}
    >
      <Typography
        id="season-recap-links"
        component="h2"
        variant="h6"
        sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}
      >
        <CelebrationIcon sx={{ color: "primary.main" }} aria-hidden />
        {t("profileCard.listTitle")}
      </Typography>
      <Box component="ul" sx={{ listStyle: "none", p: 0, m: 0 }}>
        {seasons.map((s) => (
          <Box
            component="li"
            key={s.season}
            sx={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 1,
              py: 1,
              borderTop: 1,
              borderColor: "divider",
              "&:first-of-type": { borderTop: 0, pt: 0 },
            }}
          >
            <Typography sx={{ flex: "1 1 160px" }}>
              {t("profileCard.listItem", { season: s.season })}
            </Typography>
            {s.people.map((p) => (
              <Button
                key={p.childId ?? "self"}
                href={recapPath(s.season, p.childId)}
                variant="outlined"
                size="small"
                sx={{ minHeight: 40 }}
              >
                {s.people.length === 1 && !p.childId
                  ? t("profileCard.cta")
                  : p.childId
                    ? p.firstName
                    : t("forSelf")}
              </Button>
            ))}
          </Box>
        ))}
      </Box>
    </Paper>
  );
}
