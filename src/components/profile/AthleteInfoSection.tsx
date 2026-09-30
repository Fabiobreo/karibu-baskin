import { Box, Divider, Paper, Stack, Typography } from "@mui/material";
import { getTranslations, getLocale } from "next-intl/server";
import { getDateFnsLocale } from "@/lib/dateLocale";
import { getEntityLabels } from "@/lib/entityLabels";
import RoleBadge from "@/components/common/RoleBadge";
import ProfileRow from "@/components/profile/ProfileRow";
import { format } from "date-fns";
import type { Gender } from "@prisma/client";
import { FONT_WEIGHT } from "@/lib/fontWeight";

interface AthleteInfoSectionProps {
  sportRole: number | null;
  gender: Gender | null;
  birthDate: Date | null;
  roleHistory: { sportRole: number; changedAt: Date }[];
}

/** Sezione "Dati atleta" del profilo (Server Component). */
export default async function AthleteInfoSection({
  sportRole,
  gender,
  birthDate,
  roleHistory,
}: AthleteInfoSectionProps) {
  const t = await getTranslations("profile");
  const tPlayers = await getTranslations("players");
  const { roleLabel, genderLabel } = await getEntityLabels();
  const dateLocale = getDateFnsLocale(await getLocale());
  const hasAthleteData = sportRole || gender || birthDate;

  return (
    <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 3 }}>
      <Typography component="h2" variant="subtitle1" gutterBottom>
        {tPlayers("athleteInfo")}
      </Typography>

      {hasAthleteData ? (
        <Stack spacing={2}>
          {sportRole && (
            <ProfileRow label={tPlayers("baskinRole")}>
              <RoleBadge role={sportRole} />
            </ProfileRow>
          )}
          {gender && (
            <ProfileRow label={tPlayers("gender")}>
              <Typography variant="body2">{genderLabel(gender)}</Typography>
            </ProfileRow>
          )}
          {birthDate && (
            <ProfileRow label={tPlayers("birthDate")}>
              <Typography variant="body2">
                {format(new Date(birthDate), "d MMMM yyyy", { locale: dateLocale })}
              </Typography>
            </ProfileRow>
          )}

          {roleHistory.length > 0 && (
            <>
              <Divider />
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={FONT_WEIGHT.semibold}
                  display="block"
                  gutterBottom
                >
                  {tPlayers("roleHistory")}
                </Typography>
                <Stack spacing={0.5}>
                  {roleHistory.map((h, i) => (
                    <Typography key={i} variant="caption" color="text.secondary">
                      <Box
                        component="span"
                        sx={{ color: "text.primary", fontWeight: FONT_WEIGHT.semibold }}
                      >
                        {roleLabel(h.sportRole)}
                      </Box>
                      {" · "}
                      {format(new Date(h.changedAt), "d MMM yyyy", { locale: dateLocale })}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            </>
          )}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {t("noAthleteData")}
        </Typography>
      )}
    </Paper>
  );
}
