import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Box } from "@mui/material";
import SfidaGame from "./SfidaGame";
import { buildSfida, type SfidaContext, type SfidaPlayerView } from "@/lib/games/sfidaState";
import { mulberry32 } from "@/lib/seededRandom";
import { TEAM, TEAM_LABEL } from "@/lib/palette";
import messages from "@/i18n/messages/it.json";

// Due rose finte da 11, con abbastanza ruoli per la partita intera.
const FIRST = [
  "Marta",
  "Luca",
  "Paolo",
  "Sofia",
  "Sara",
  "Davide",
  "Francesca",
  "Elena",
  "Marco",
  "Giulia",
  "Ivan",
];
const SECOND = [
  "Bea",
  "Nicola",
  "Chiara",
  "Tommaso",
  "Irene",
  "Giorgio",
  "Anna",
  "Alice",
  "Pietro",
  "Ugo",
  "Rita",
];
const SHAPE: [number, "MALE" | "FEMALE"][] = [
  [1, "FEMALE"],
  [2, "MALE"],
  [3, "MALE"],
  [3, "FEMALE"],
  [4, "FEMALE"],
  [4, "MALE"],
  [4, "FEMALE"],
  [5, "FEMALE"],
  [5, "MALE"],
  [5, "FEMALE"],
  [5, "MALE"],
];
const roster = (names: string[], team: string): SfidaPlayerView[] =>
  names.map((name, i) => ({
    key: `user-${team}${i}`,
    name,
    sportRole: SHAPE[i][0],
    gender: SHAPE[i][1],
    teamIds: [team],
  }));

const ctx: SfidaContext = {
  players: [...roster(FIRST, "kap"), ...roster(SECOND, "mon")],
  teams: [
    { id: "kap", name: "Kapuleti", fill: { bg: TEAM.raspberry, fg: TEAM_LABEL.raspberry } },
    { id: "mon", name: "Montekki", fill: { bg: TEAM.green, fg: TEAM_LABEL.green } },
  ],
  names: messages.simulator.names,
};

const meta: Meta<typeof SfidaGame> = {
  title: "Giochi/Sfida",
  component: SfidaGame,
  decorators: [
    (Story) => (
      <Box sx={{ maxWidth: 880, mx: "auto", p: 2 }}>
        <Story />
      </Box>
    ),
  ],
  args: { players: ctx.players, teams: ctx.teams, names: ctx.names, initialOutcome: null },
};
export default meta;
type Story = StoryObj<typeof SfidaGame>;

export const PartitaIntera: Story = {
  args: { initial: buildSfida(ctx, { mode: "full", grouping: "season" }, mulberry32(4))! },
};

export const PartitaInteraGiocata: Story = {
  args: {
    initial: buildSfida(ctx, { mode: "full", grouping: "season" }, mulberry32(4))!,
    initialOutcome: {
      kind: "full",
      scoreA: 38,
      scoreB: 34,
      winner: "A",
      quarters: [
        { a: 9, b: 7 },
        { a: 8, b: 10 },
        { a: 11, b: 8 },
        { a: 10, b: 9 },
      ],
    },
  },
};

export const SeiControSei: Story = {
  args: { initial: buildSfida(ctx, { mode: "six", grouping: "season" }, mulberry32(2))! },
};

export const TuttiMescolati: Story = {
  args: { initial: buildSfida(ctx, { mode: "six", grouping: "mixed" }, mulberry32(5))! },
};
