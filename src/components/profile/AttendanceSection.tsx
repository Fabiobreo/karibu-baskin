import { Chip, Paper, Stack, Typography } from "@mui/material";
import { getTranslations } from "next-intl/server";
import ProfileRow from "@/components/profile/ProfileRow";

interface AttendanceSectionProps {
  /** Coppie [stagione, presenze] ordinate dalla più recente. */
  seasons: [string, number][];
  currentSeason: string;
}

/** Sezione "Presenze agli allenamenti" per stagione (Server Component). */
export default async function AttendanceSection({
  seasons,
  currentSeason,
}: AttendanceSectionProps) {
  const t = await getTranslations("profile");

  return (
    <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
        {t("trainingAttendance")}
      </Typography>
      <Stack spacing={1}>
        {seasons.map(([season, count]) => (
          <ProfileRow key={season} label={t("seasonLabel", { season })}>
            <Chip
              label={t("trainingsCount", { count })}
              size="small"
              variant={season === currentSeason ? "filled" : "outlined"}
              color={season === currentSeason ? "primary" : "default"}
              sx={{ fontWeight: 600 }}
            />
          </ProfileRow>
        ))}
      </Stack>
    </Paper>
  );
}
