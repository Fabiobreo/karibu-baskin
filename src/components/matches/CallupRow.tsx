"use client";

import { Avatar, Box, Typography } from "@mui/material";
import Link from "next/link";
import type { CallupWithStat } from "@/components/matches/matchDetailTypes";

/** Riga di un convocato: avatar, nome, eventuale variante ruolo e punti se la partita è giocata. */
export default function CallupRow({ c, hasScore }: { c: CallupWithStat; hasScore: boolean }) {
  const person = c.user ?? c.child;
  if (!person) return null;
  const name = person.name ?? "—";
  const variant = person.sportRoleVariant ?? null;
  const image = c.user?.image ?? null;
  const slug = c.user?.slug ?? c.user?.id ?? c.child?.slug ?? c.child?.id ?? null;

  const inner = (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1.25 }}>
      <Avatar src={image ?? undefined} sx={{ width: 38, height: 38, fontSize: 14 }}>
        {name[0]}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={700} noWrap>
          {name}
        </Typography>
        {variant && (
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.65rem" }}>
            {`var. ${variant}`}
          </Typography>
        )}
      </Box>
      {hasScore && c.stat !== null && (
        <Box sx={{ textAlign: "right", flexShrink: 0 }}>
          <Typography
            sx={{ fontSize: "1.15rem", fontWeight: 900, color: "primary.main", lineHeight: 1 }}
          >
            {c.stat.points}
          </Typography>
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.6rem" }}>
            pt
          </Typography>
        </Box>
      )}
    </Box>
  );

  return slug ? (
    <Link href={`/giocatori/${slug}`} style={{ textDecoration: "none", color: "inherit" }}>
      <Box
        sx={{
          cursor: "pointer",
          transition: "background 0.12s",
          "&:hover": { bgcolor: "action.hover" },
        }}
      >
        {inner}
      </Box>
    </Link>
  ) : (
    <Box>{inner}</Box>
  );
}
