import type { AppRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      appRole: AppRole;
    } & DefaultSession["user"];
  }

  interface User {
    appRole: AppRole;
  }
}
