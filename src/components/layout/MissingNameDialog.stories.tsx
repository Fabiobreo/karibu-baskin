import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import MissingNameDialog from "./MissingNameDialog";

const meta: Meta<typeof MissingNameDialog> = {
  title: "Onboarding/MissingNameDialog",
  component: MissingNameDialog,
  parameters: { layout: "fullscreen" },
  args: { email: "rosella.defranceschi@alice.it" },
};
export default meta;

type Story = StoryObj<typeof MissingNameDialog>;

export const PrimoAccesso: Story = {};
