import SessionCard, { type SessionWithCount } from "@/components/SessionCard";
import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<typeof SessionCard>, "hero" | "muted" | "live">;

export default function SessionHeroCard(props: Props) {
  return <SessionCard hero {...props} />;
}

export type { SessionWithCount };
