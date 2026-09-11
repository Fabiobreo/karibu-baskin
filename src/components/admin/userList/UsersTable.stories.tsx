import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Box, Paper } from "@mui/material";
import { fn } from "storybook/test";
import UsersTable from "./UsersTable";
import type { AdminRow, TeamInfo } from "./userListShared";

const SEASON = "2026-27";
const teams: TeamInfo[] = [
  { id: "karigin", name: "KariGin", season: SEASON, color: "#7B1FA2" },
  { id: "karitonic", name: "KariTonic", season: SEASON, color: "#2E7D32" },
];

function user(
  i: number,
  name: string,
  email: string,
  overrides: Partial<AdminRow & { kind: "user" }> = {}
): AdminRow {
  return {
    kind: "user",
    id: `u${i}`,
    name,
    email,
    image: null,
    appRole: "ATHLETE",
    sportRole: (i % 5) + 1,
    sportRoleVariant: null,
    sportRoleSuggested: null,
    sportRoleSuggestedVariant: null,
    gender: i % 2 ? "MALE" : "FEMALE",
    birthDate: null,
    athleteStatus: null,
    ratingMu: null,
    ratingSigma: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    _count: { registrations: i },
    sportRoleHistory: [],
    teamMemberships:
      i % 3 === 0
        ? []
        : [{ id: `m${i}`, teamId: teams[i % 2].id, isCaptain: false, team: teams[i % 2] }],
    ...overrides,
  };
}

const rows: AdminRow[] = [
  user(1, "Rosella De Franceschi", "roselladefranceschi@alice.it", {
    appRole: "PARENT",
    sportRole: null,
  }),
  user(2, "Matteo Frealdo", "matteo.fre@gmail.com"),
  user(3, "Roncari Alessandro", "alessandroroncari2009@gmail.com"),
  user(4, "Elisa Castagna", "isettacasta@gmail.com", { appRole: "ADMIN" }),
  user(5, "Tasson Sara", "sara.tasson@gmail.com", {
    sportRole: null,
    sportRoleSuggested: 4,
    ratingMu: 26.2,
    ratingSigma: 6.1,
  }),
  user(6, "Bartolomeo Vattelapesca Zanellato", "bartolomeo.vattelapesca.zanellato@libero.it", {
    athleteStatus: "INACTIVE_SEASON",
  }),
];

/** Larghezza del pannello admin su desktop (container lg meno padding del Paper). */
function Panel({ width }: { width: number }) {
  return (
    <Box sx={{ width, maxWidth: "100%" }}>
      <Paper elevation={2} sx={{ p: 3 }}>
        <UsersTable
          rows={rows}
          sortBy="createdAt"
          sortDir="desc"
          onSort={fn()}
          teams={teams}
          currentSeason={SEASON}
          activeFilterCount={0}
          onRoleChange={fn()}
          onConfirmSuggestedRole={fn()}
          onRejectSuggestedRole={fn()}
          onTeamChange={fn()}
          onEdit={fn()}
          onDelete={fn()}
        />
      </Paper>
    </Box>
  );
}

const meta: Meta<typeof Panel> = {
  title: "Admin/UsersTable",
  component: Panel,
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj<typeof Panel>;

export const Desktop: Story = { args: { width: 1152 } };
export const Tablet: Story = { args: { width: 900 } };
