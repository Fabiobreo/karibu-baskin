import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { Box, Button } from "@mui/material";
import { fn } from "storybook/test";
import MatchFormDialog, {
  type MatchFormGroup,
  type MatchFormMatch,
  type MatchFormOpposingTeam,
  type MatchFormTeam,
} from "./MatchFormDialog";

const teams: MatchFormTeam[] = [
  { id: "kapuleti-27", name: "Kapuleti", season: "2026-27", color: "#E65100", isMixed: false },
  { id: "karibu-2026-27", name: "Karibu", season: "2026-27", color: "#E65100", isMixed: true },
  { id: "montekki-26", name: "Montekki", season: "2025-26", color: "#1565C0", isMixed: false },
  { id: "kapuleti-26", name: "Kapuleti", season: "2025-26", color: "#E65100", isMixed: false },
  { id: "karibu-2025-26", name: "Karibu", season: "2025-26", color: "#E65100", isMixed: true },
];

const opponents: MatchFormOpposingTeam[] = [
  { id: "opp-vicenza", name: "Baskin Vicenza", city: "Vicenza" },
  { id: "opp-verona", name: "Baskin Verona", city: "Verona" },
];

const groups: MatchFormGroup[] = [
  {
    id: "girone-a",
    name: "Girone A",
    season: "2025-26",
    championship: "Veneto",
    competitiveTeamIds: ["montekki-26"],
  },
  {
    id: "girone-b",
    name: "Girone B",
    season: "2025-26",
    championship: "Veneto",
    competitiveTeamIds: ["kapuleti-26"],
  },
];

const leagueMatch: MatchFormMatch = {
  id: "match-league",
  teamId: "montekki-26",
  opponentId: "opp-vicenza",
  opponentTeamId: null,
  date: "2026-05-17T13:00:00.000Z",
  isHome: true,
  venue: "PalaKaribu, Montecchio Maggiore",
  matchType: "LEAGUE",
  notes: "Portare le divise arancioni",
  imageUrl: null,
  matchday: 5,
  groupId: "girone-a",
};

const internalFriendly: MatchFormMatch = {
  id: "match-internal",
  teamId: "kapuleti-26",
  opponentId: null,
  opponentTeamId: "montekki-26",
  date: "2026-06-17T11:19:00.000Z",
  isHome: false,
  venue: "Palestra Arzignano",
  matchType: "FRIENDLY",
  notes: null,
  imageUrl: null,
  matchday: null,
  groupId: null,
};

/** Apre il dialog da un pulsante, come in AdminPartiteClient (open false → true). */
function Harness({ editMatch }: { editMatch: MatchFormMatch }) {
  const [open, setOpen] = useState(false);
  return (
    <Box>
      <Button variant="contained" onClick={() => setOpen(true)}>
        Modifica
      </Button>
      <MatchFormDialog
        open={open}
        onClose={() => setOpen(false)}
        editMatch={editMatch}
        teams={teams}
        opponents={opponents}
        groups={groups}
        onOpponentCreated={fn()}
        onSaved={fn()}
      />
    </Box>
  );
}

const meta: Meta<typeof Harness> = {
  title: "Admin/MatchFormDialog",
  component: Harness,
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj<typeof Harness>;

export const ModificaCampionato: Story = { args: { editMatch: leagueMatch } };
export const ModificaAmichevoleInterna: Story = { args: { editMatch: internalFriendly } };
