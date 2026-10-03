import type { AppRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      appRole: AppRole;
      customImage?: string | null;
      /** Vede "Le mie disponibilità" (`showsAvailabilities`, UX-46). */
      showsAvailabilities?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    appRole: AppRole;
  }
}
