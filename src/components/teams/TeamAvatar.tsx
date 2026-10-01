import { Avatar } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { teamFill } from "@/lib/teamColors";
import { FONT_WEIGHT } from "@/lib/fontWeight";

interface TeamAvatarProps {
  name: string | null | undefined;
  /** Foto della persona: se c'e', ha la precedenza sull'iniziale. */
  image?: string | null;
  /** Colore salvato della squadra (chiave o hex storico), o niente. */
  color: string | null | undefined;
  /** Lato in px. */
  size: number;
  sx?: SxProps<Theme>;
}

/**
 * Avatar di un giocatore con l'iniziale sul riempimento della sua squadra
 * (UX-29: la tinta e' l'identita' della squadra, come riempimento, e il nome
 * della persona sta sempre accanto). L'etichetta e' quella della tinta (bianca
 * o scura, >= 4,5:1); l'Oro ha l'anello per staccarsi dalle superfici chiare.
 * Senza tinta l'avatar e' neutro, mai arancio.
 *
 * Niente "use client" e niente `sx` a funzione: si usa anche nei Server Component.
 */
export default function TeamAvatar({ name, image, color, size, sx }: TeamAvatarProps) {
  const fill = teamFill(color);
  return (
    <Avatar
      src={image ?? undefined}
      sx={[
        {
          width: size,
          height: size,
          flexShrink: 0,
          fontWeight: FONT_WEIGHT.semibold,
          bgcolor: fill?.bg ?? "action.selected",
          color: fill?.fg ?? "text.primary",
          ...(fill?.ring ? { boxShadow: `inset 0 0 0 1px ${fill.ring}` } : {}),
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {(name ?? "?").trim()[0]?.toUpperCase() ?? "?"}
    </Avatar>
  );
}
