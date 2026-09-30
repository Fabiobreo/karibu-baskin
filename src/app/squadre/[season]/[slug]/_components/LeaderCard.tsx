import { Avatar, Box, Paper, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import Link from "next/link";
import { brandColor } from "@/lib/heroStyles";
import MedalDisc from "@/components/rating/MedalDisc";
import { onHover } from "@/lib/hoverStyles";
import { TYPE_SCALE } from "@/lib/typeScale";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { teamFill } from "@/lib/teamColors";

export default function LeaderCard({
  rank,
  leader,
  teamColor,
  avgLabel,
}: {
  rank: number;
  /** Media a partita gia' formattata e tradotta ("8,5/partita"). */
  avgLabel: string;
  leader: {
    name: string;
    image: string | null;
    slug: string | null;
    points: number;
    games: number;
  };
  /** Hex della tinta squadra (da `teamColor()`), o null: nessun segno di colore. */
  teamColor: string | null;
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
        // Si solleva solo quando porta al profilo: senza link e' da leggere.
        ...(leader.slug
          ? onHover({ borderColor: "primary.main", transform: "translateY(-2px)" })
          : {}),
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
          // Iniziale nella tinta squadra (etichetta bianca); senza tinta neutra (UX-29).
          bgcolor: teamColor ?? "action.selected",
          color: teamFill(teamColor)?.fg ?? "text.primary",
          fontSize: TYPE_SCALE.xl,
          fontWeight: FONT_WEIGHT.bold,
        }}
      >
        {leader.name[0]?.toUpperCase()}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0, pr: 3 }}>
        <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold} noWrap>
          {leader.name}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5, mt: 0.25 }}>
          {/* Il numero e' un dato: text.primary, mai la tinta squadra (UX-29). */}
          <Typography
            variant="h5"
            component="span"
            sx={{ lineHeight: 1, fontVariantNumeric: "tabular-nums", color: "text.primary" }}
          >
            {leader.points}
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={FONT_WEIGHT.semibold}>
            pt
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
            · {avgLabel}
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
