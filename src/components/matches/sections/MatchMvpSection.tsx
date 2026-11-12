import { Box, Paper, Typography } from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import TeamAvatar from "@/components/teams/TeamAvatar";
import RoleBadge from "@/components/common/RoleBadge";
import MatchSectionTitle from "@/components/matches/sections/MatchSectionTitle";
import { FONT_WEIGHT } from "@/lib/fontWeight";

export interface MvpEntry {
  id: string;
  name: string;
  image: string | null;
  sportRole: number | null;
  /** Segmento di `/giocatori/…`. */
  slug: string | null;
}

interface MatchMvpSectionProps {
  mvps: MvpEntry[];
  /** Tinta della squadra; null nelle amichevoli interne (avatar neutri). */
  teamColor: string | null;
}

/**
 * MVP della partita (UX-58): subito dopo "Per te", con l'avatar nella tinta
 * della squadra e il nome. Il metallo dell'oro va con la coppa (UX-29).
 */
export default async function MatchMvpSection({ mvps, teamColor }: MatchMvpSectionProps) {
  const t = await getTranslations("matches");
  if (mvps.length === 0) return null;

  return (
    <Box component="section" aria-labelledby="mvp-title">
      <MatchSectionTitle id="mvp-title" icon={<EmojiEventsIcon />}>
        {t("mvp")}
      </MatchSectionTitle>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
          gap: 1.5,
        }}
      >
        {mvps.map((m) => {
          const content = (
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                height: "100%",
                borderColor: "medal.gold",
                ...(m.slug
                  ? {
                      transition: "border-color 0.15s",
                      "&:hover .mvp-arrow": { color: "primary.main" },
                    }
                  : {}),
              }}
            >
              <TeamAvatar name={m.name} image={m.image} color={teamColor} size={44} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="body1"
                  sx={{ fontWeight: FONT_WEIGHT.semibold, overflowWrap: "anywhere" }}
                >
                  {m.name}
                </Typography>
                {m.sportRole && (
                  <Box sx={{ mt: 0.25 }}>
                    <RoleBadge role={m.sportRole} />
                  </Box>
                )}
              </Box>
              <EmojiEventsIcon sx={{ color: "medal.gold" }} aria-hidden="true" />
              {m.slug && (
                <ChevronRightIcon
                  className="mvp-arrow"
                  sx={{ color: "text.secondary" }}
                  aria-hidden="true"
                />
              )}
            </Paper>
          );
          return m.slug ? (
            <Link key={m.id} href={`/giocatori/${m.slug}`} style={{ textDecoration: "none" }}>
              {content}
            </Link>
          ) : (
            <Box key={m.id}>{content}</Box>
          );
        })}
      </Box>
    </Box>
  );
}
