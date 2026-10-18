"use client";

import { Box, Typography } from "@mui/material";
import Link from "next/link";
import TeamAvatar from "@/components/teams/TeamAvatar";
import type { CallupWithStat } from "@/components/matches/matchDetailTypes";
import { TYPE_SCALE } from "@/lib/typeScale";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { RADIUS } from "@/lib/radius";

/**
 * Riga di un convocato nella distinta: avatar, nome, eventuale variante ruolo
 * e punti se la partita è giocata. Su telefono sta in una griglia a due
 * colonne (il nome va a capo), da `md` è una riga della card del ruolo.
 * `mine` (chi guarda o un suo figlio) la evidenzia con un'etichetta.
 */
export default function CallupRow({
  c,
  hasScore,
  teamColor = null,
  mine = null,
}: {
  c: CallupWithStat;
  hasScore: boolean;
  /** Colore salvato della squadra per cui e' convocato: tinta dell'avatar. */
  teamColor?: string | null;
  /** Etichetta della persona di chi guarda ("Tu", "Famiglia"), null per gli altri. */
  mine?: string | null;
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
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: { xs: 1, md: 1.25 },
        px: { xs: 1.25, md: 1.5 },
        py: 1,
        height: "100%",
        bgcolor: mine ? "action.hover" : undefined,
      }}
    >
      <TeamAvatar
        name={name}
        image={image}
        color={teamColor}
        size={32}
        sx={{ fontSize: TYPE_SCALE.sm }}
      />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          fontWeight={FONT_WEIGHT.semibold}
          sx={{
            lineHeight: 1.3,
            // Su telefono la colonna è stretta: due righe prima di troncare.
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: { xs: 2, md: 1 },
            overflow: "hidden",
            wordBreak: "break-word",
          }}
        >
          {name}
        </Typography>
        {(variant || mine) && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.25 }}>
            {variant && (
              <Typography variant="caption" color="text.secondary">
                {`var. ${variant}`}
              </Typography>
            )}
            {mine && (
              <Typography
                variant="caption"
                component="span"
                sx={{
                  px: 0.75,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: RADIUS.sm,
                  color: "text.secondary",
                  lineHeight: 1.5,
                }}
              >
                {mine}
              </Typography>
            )}
          </Box>
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
          <Typography variant="caption" color="text.secondary">
            pt
          </Typography>
        </Box>
      )}
    </Box>
  );

  return slug ? (
    <Link
      href={`/giocatori/${slug}`}
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
      <Box
        sx={{
          height: "100%",
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
