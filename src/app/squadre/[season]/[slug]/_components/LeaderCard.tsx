import { Avatar, Box, Paper, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import Link from "next/link";

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
  const medalGradient =
    rank === 1
      ? "linear-gradient(135deg, #FFD54F 0%, #FFA000 100%)"
      : rank === 2
        ? "linear-gradient(135deg, #E0E0E0 0%, #9E9E9E 100%)"
        : "linear-gradient(135deg, #D7A56B 0%, #8D6E63 100%)";
  const MedalIcon = rank === 1 ? EmojiEventsIcon : WorkspacePremiumIcon;
  const isFirst = rank === 1;

  const content = (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        pt: 2.5,
        border: "1px solid",
        borderColor: isFirst ? "medal.gold" : "divider",
        boxShadow: isFirst ? `0 4px 16px ${alpha("#FFC107", 0.2)}` : "none",
        height: "100%",
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        position: "relative",
        overflow: "hidden",
        transition: "all 0.15s",
        "&:hover": { borderColor: teamColor, transform: "translateY(-2px)" },
      }}
    >
      {/* Medaglia/trofeo in alto a destra */}
      <Box
        sx={{
          position: "absolute",
          top: 8,
          right: 8,
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: medalGradient,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "common.white",
          boxShadow: `0 3px 10px ${alpha("#000000", 0.25)}`,
          border: "2px solid",
          borderColor: "common.white",
        }}
      >
        <MedalIcon sx={{ fontSize: 18, color: "common.white" }} />
      </Box>
      <Avatar
        src={leader.image ?? undefined}
        sx={{ width: 52, height: 52, bgcolor: teamColor, fontSize: 20, fontWeight: 800 }}
      >
        {leader.name[0]?.toUpperCase()}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0, pr: 3 }}>
        <Typography variant="body2" fontWeight={700} noWrap>
          {leader.name}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5, mt: 0.25 }}>
          <Typography
            variant="h5"
            fontWeight={900}
            sx={{ color: teamColor, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}
          >
            {leader.points}
          </Typography>
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
