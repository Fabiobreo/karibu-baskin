import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Box } from "@mui/material";
import RoleQuizClient from "./RoleQuizClient";
import { getRolesInfo } from "@/lib/content/baskinInfo";

const meta: Meta<typeof RoleQuizClient> = {
  title: "Onboarding/RoleQuizClient",
  component: RoleQuizClient,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <Box sx={{ maxWidth: 600, mx: "auto" }}>
        <Story />
      </Box>
    ),
  ],
  args: {
    confirmed: null,
    suggested: null,
    rolesInfo: getRolesInfo("it"),
    nextSession: { href: "/allenamento/demo", registered: false },
  },
};
export default meta;

type Story = StoryObj<typeof RoleQuizClient>;

export const Questionario: Story = {};

export const RuoloSuggerito: Story = {
  args: { suggested: { role: 2, variant: "T" } },
};

export const RuoloConfermato: Story = {
  args: { confirmed: { role: 4 } },
};
