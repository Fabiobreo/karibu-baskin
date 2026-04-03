import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import type { AppRole } from "@prisma/client";
import type { Adapter } from "next-auth/adapters";
import { sendPushToAll } from "@/lib/webpush";
import { generateUserSlug } from "@/lib/slugUtils";

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
    async signIn({ user, account, profile }) {
      // Ad ogni accesso Google aggiorna nome e foto profilo nel DB.
      // Se l'utente non ha ancora uno slug, lo genera ora.
      // Fire-and-forget: non blocca mai il login se fallisce.
      if (account?.provider === "google" && profile && user.email) {
        const picture = (profile as { picture?: string }).picture;
        (async () => {
          // Recupera l'utente per verificare se ha già uno slug
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email! },
            select: { id: true, slug: true },
          });
          if (!dbUser) return;

          const slugToSet = (!dbUser.slug && (profile.name ?? user.name))
            ? await generateUserSlug(profile.name ?? user.name ?? "")
            : null;

          await prisma.user.update({
            where: { id: dbUser.id },
            data: {
              ...(profile.name ? { name: profile.name } : {}),
              ...(picture ? { image: picture } : {}),
              ...(slugToSet ? { slug: slugToSet } : {}),
            },
          });
        })().catch(() => {});
      }
      return true;
    },
    async session({ session, user }) {
      session.user.id = user.id;
      session.user.appRole = (user as typeof user & { appRole: AppRole }).appRole;
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Genera slug per il nuovo utente
      if (user.name && user.id) {
        generateUserSlug(user.name)
          .then((slug) => {
            if (slug) {
              return prisma.user.update({ where: { id: user.id! }, data: { slug } });
            }
          })
          .catch(() => {});
      }
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
