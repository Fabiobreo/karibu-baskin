import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import type { AppRole } from "@prisma/client";
import type { Adapter } from "next-auth/adapters";
import { sendPushToAll } from "@/lib/webpush";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  // Cast necessario: next-auth@beta e @auth/prisma-adapter hanno versioni interne di @auth/core
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  session: { strategy: "database", maxAge: 60 * 60 * 24 * 365 }, // 1 anno
  callbacks: {
    async session({ session, user }) {
      session.user.id = user.id;
      session.user.appRole = (user as typeof user & { appRole: AppRole }).appRole;
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Notifica admin quando un nuovo utente si registra
      sendPushToAll(
        { title: "👤 Nuovo utente", body: `${user.name ?? user.email} si è registrato — in attesa di conferma.`, url: "/admin/utenti" },
        true // solo admin
      ).catch(() => {});
    },
  },
  pages: {
    signIn: "/login",
  },
});
