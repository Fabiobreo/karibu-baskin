import { Box, Grid2 as Grid, Paper, Typography } from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import GroupsIcon from "@mui/icons-material/Groups";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { getTranslations } from "next-intl/server";
import { TYPE_SCALE } from "@/lib/typeScale";

type ValueItem = { title: string; body: string };

/**
 * "Quello in cui crediamo": i quattro valori del club. Li mostrano la home e
 * `/il-club` (UX-36b): stesso componente e stessi testi (`home.values`), così
 * le due pagine non possono dire cose diverse.
 */
export default async function ClubValues({ overline = true }: { overline?: boolean }) {
  const t = await getTranslations("home");
  const values = t.raw("values") as ValueItem[];

  return (
    <Box>
      {overline && (
        <Typography variant="overline" color="text.secondary">
          {t("whoWeAre")}
        </Typography>
      )}
      <Typography
        variant="h4"
        component="h2"
        sx={{ mt: 0.5, mb: 3, fontSize: { xs: TYPE_SCALE.xl2, md: TYPE_SCALE.xl3 } }}
      >
        {t("whatWeBelieve")}
      </Typography>
      <Grid container spacing={2}>
        {[FavoriteIcon, GroupsIcon, EmojiEventsIcon, LocationOnIcon].map((Icon, i) => (
          <Grid key={i} size={{ xs: 12, sm: 6 }}>
            <Paper
              elevation={0}
              sx={{ p: 3, border: "1px solid", borderColor: "divider", height: "100%" }}
            >
              <Box sx={{ color: "primary.main", mb: 1.5 }}>
                <Icon sx={{ fontSize: 32 }} />
              </Box>
              <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
                {values[i]?.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                {values[i]?.body}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
