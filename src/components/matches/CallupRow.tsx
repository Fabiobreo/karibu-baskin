"use client";

import { Box, Typography } from "@mui/material";
import Link from "next/link";
import TeamAvatar from "@/components/teams/TeamAvatar";
import type { CallupWithStat } from "@/components/matches/matchDetailTypes";
import { TYPE_SCALE } from "@/lib/typeScale";
import { FONT_WEIGHT } from "@/lib/fontWeight";

/** Riga di un convocato: avatar, nome, eventuale variante ruolo e punti se la partita è giocata. */
export default function CallupRow({
  c,
  hasScore,
  teamColor = null,
}: {
  c: CallupWithStat;
  hasScore: boolean;
  /** Colore salvato della squadra per cui e' convocato: tinta dell'avatar. */
  teamColor?: string | null;
}) {
  const person = c.user ?? c.child;
  if (!person) return null;
  const name = person.name ?? "—";
  const variant = person.sportRoleVariant ?? null;
  const image = c.user?.image ?? null;
  // Per gli utenti `slug` è già il segmento da linkare, null se non hanno un
  // profilo pubblico (vedi withProfileLink): niente fallback sull'id.
  const slug = c.user ? c.user.slug : (c.child?.slug ?? c.child?.id ?? null);

  const inner = (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1.25 }}>
      <TeamAvatar
        name={name}
        image={image}
        color={teamColor}
        size={38}
        sx={{ fontSize: TYPE_SCALE.sm }}
      />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold} noWrap>
          {name}
        </Typography>
        {variant && (
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: TYPE_SCALE.xs }}>
            {`var. ${variant}`}
          </Typography>
        )}
      </Box>
      {hasScore && c.stat !== null && (
        <Box sx={{ textAlign: "right", flexShrink: 0 }}>
          <Typography
            sx={{
              fontSize: TYPE_SCALE.lg,
              fontWeight: FONT_WEIGHT.bold,
              color: "text.primary",
              lineHeight: 1,
            }}
          >
            {c.stat.points}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: TYPE_SCALE.xs }}>
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
