import { Avatar, Box, Paper, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import Link from "next/link";
import { contrastText } from "@/lib/colorUtils";
import { brandColor } from "@/lib/heroStyles";
import MedalDisc from "@/components/rating/MedalDisc";
import AccentText from "@/components/common/AccentText";
import { onHover } from "@/lib/hoverStyles";

export default function LeaderCard({
  rank,
  leader,
  teamColor,
}: {
  rank: number;
  leader: {
    name: string;
    image: string | null;
    slug: string | null;
    points: number;
    games: number;
  };
  teamColor: string;
}) {
  const isFirst = rank === 1;

  const content = (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        pt: 2.5,
        border: "1px solid",
        borderColor: isFirst ? "medal.gold" : "divider",
        boxShadow: isFirst ? `0 4px 16px ${alpha(brandColor.black, 0.14)}` : "none",
        height: "100%",
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        position: "relative",
        overflow: "hidden",
        transition: "all 0.15s",
        ...onHover({ borderColor: teamColor, transform: "translateY(-2px)" }),
      }}
    >
      {/* Medaglia/trofeo in alto a destra */}
      <Box sx={{ position: "absolute", top: 8, right: 8 }}>
        <MedalDisc rank={rank === 1 ? 1 : rank === 2 ? 2 : 3} />
      </Box>
      <Avatar
        src={leader.image ?? undefined}
        sx={{
          width: 52,
          height: 52,
          bgcolor: teamColor,
          color: contrastText(teamColor),
          fontSize: 20,
          fontWeight: 800,
        }}
      >
        {leader.name[0]?.toUpperCase()}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0, pr: 3 }}>
        <Typography variant="body2" fontWeight={700} noWrap>
          {leader.name}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5, mt: 0.25 }}>
          {/* Il colore squadra arriva dal DB: come testo va adattato alla
              superficie, o un verde chiaro sparisce sulla card bianca. */}
          <AccentText
            variant="h5"
            fontWeight={900}
            accent={teamColor}
            sx={{ lineHeight: 1, fontVariantNumeric: "tabular-nums" }}
          >
            {leader.points}
          </AccentText>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            pt
          </Typography>
          <Typography variant="caption" color="text.disabled" sx={{ ml: 0.5 }}>
            · {(leader.points / leader.games).toFixed(1)}/partita
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
  return leader.slug ? (
    <Link href={`/giocatori/${leader.slug}`} style={{ textDecoration: "none" }}>
      {content}
    </Link>
  ) : (
    content
  );
}
