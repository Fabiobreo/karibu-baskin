import { Paper, Stack, Typography } from "@mui/material";
import { getTranslations } from "next-intl/server";
import ProfileRow from "@/components/profile/ProfileRow";

interface AttendanceSectionProps {
  /** Coppie [stagione, presenze] ordinate dalla più recente. */
  seasons: [string, number][];
}

/** Sezione "Presenze agli allenamenti" per stagione (Server Component). */
export default async function AttendanceSection({ seasons }: AttendanceSectionProps) {
  const t = await getTranslations("profile");

  return (
    <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 3 }}>
      <Typography component="h2" variant="subtitle1" gutterBottom>
        {t("trainingAttendance")}
      </Typography>
      {seasons.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          {t("attendanceEmpty")}
        </Typography>
      )}
      {/* Un elenco, non chip: un numero non si tocca (UX-42). */}
      <Stack component="dl" spacing={1} sx={{ m: 0 }}>
        {seasons.map(([season, count]) => (
          <ProfileRow key={season} label={t("seasonLabel", { season })}>
            <Typography variant="body2">{t("trainingsCount", { count })}</Typography>
          </ProfileRow>
        ))}
      </Stack>
    </Paper>
  );
}
