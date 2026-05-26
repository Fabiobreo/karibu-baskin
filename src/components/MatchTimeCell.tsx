"use client";

import { Box, Chip, Typography } from "@mui/material";
import BoltIcon from "@mui/icons-material/Bolt";
import { useHasMounted } from "@/lib/useHasMounted";
import { format } from "date-fns";
import { it } from "date-fns/locale";

const IMMINENT_HOURS = 48;

function relativeLabel(date: Date, now: Date): string {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfDate.getTime() - startOfToday.getTime()) / 86_400_000);
  if (diffDays === 0) return "Oggi";
  if (diffDays === 1) return "Domani";
  if (diffDays > 1 && diffDays <= 6) {
    return format(date, "EEEE", { locale: it }).replace(/^./, (c) => c.toUpperCase());
  }
  return `Tra ${diffDays} giorni`;
}

export default function MatchTimeCell({ dateIso }: { dateIso: string }) {
  const hasMounted = useHasMounted();
  const date = new Date(dateIso);

  if (!hasMounted) {
    return (
      <Typography variant="body2" fontWeight={800} sx={{ fontSize: "0.85rem" }}>
        {format(date, "EEEE d MMM", { locale: it }).replace(/^./, (c) => c.toUpperCase())}
      </Typography>
    );
  }

  const now = new Date();
  const isImminent = date.getTime() <= now.getTime() + IMMINENT_HOURS * 60 * 60 * 1000;

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
      <Typography variant="body2" fontWeight={800} sx={{ fontSize: "0.85rem" }}>
        {relativeLabel(date, now)}
      </Typography>
      {isImminent && (
        <Chip
          icon={<BoltIcon sx={{ fontSize: 12 }} />}
          label="Imminente"
          size="small"
          sx={{
            fontWeight: 800,
            fontSize: "0.6rem",
            height: 18,
            bgcolor: "primary.main",
            color: "#fff",
            "& .MuiChip-icon": { ml: "4px", mr: "-4px" },
          }}
        />
      )}
    </Box>
  );
}
