import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { sendMagicLinkEmail, AUTH_EMAIL_FROM, MAGIC_LINK_MAX_AGE_SECONDS } from "@/lib/authEmail";
import { prisma } from "@/lib/db";
import type { AppRole } from "@prisma/client";
import type { Adapter } from "next-auth/adapters";
import { sendPushToAll } from "@/lib/notifications/webpush";
import { generateUserSlug } from "@/lib/slugUtils";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  // Cast necessario: next-auth@beta e @auth/prisma-adapter hanno versioni interne di @auth/core
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Permette di collegare l'account Google a utenti pre-creati dall'admin via email.
      // Intenzionale: senza questa opzione, un utente pre-creato non riuscirebbe a fare login.
      allowDangerousEmailAccountLinking: true,
    }),
    // Magic link: unica via d'accesso per chi non ha un account Google
    // (Alice, Libero, Yahoo, Hotmail…). Nessuna password in gioco.
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: AUTH_EMAIL_FROM,
      maxAge: MAGIC_LINK_MAX_AGE_SECONDS,
      sendVerificationRequest: sendMagicLinkEmail,
      // Normalizza l'indirizzo: evita utenti duplicati per differenze di
      // maiuscole/spazi tra pre-creazione admin e digitazione dell'utente.
      normalizeIdentifier: (identifier) => identifier.trim().toLowerCase(),
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

          const slugToSet =
            !dbUser.slug && (profile.name ?? user.name)
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
        })().catch((err) => console.error("[authjs] signIn profile update failed:", err));
      }

      // Accesso via magic link: non c'è un profilo OAuth da cui leggere nome e
      // foto, ma un utente pre-creato dall'admin non ha ancora lo slug (la POST
      // /api/users non lo genera). Senza slug il profilo pubblico non è raggiungibile.
      if (account?.provider === "resend" && user.email) {
        (async () => {
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email! },
            select: { id: true, slug: true, name: true },
          });
          if (!dbUser || dbUser.slug || !dbUser.name) return;
          const slug = await generateUserSlug(dbUser.name);
          if (slug) {
            await prisma.user.update({ where: { id: dbUser.id }, data: { slug } });
          }
        })().catch((err) => console.error("[authjs] signIn slug (magic link) failed:", err));
      }

      return true;
    },
    async session({ session, user }) {
      session.user.id = user.id;
      session.user.appRole = (user as typeof user & { appRole: AppRole }).appRole;
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { customImage: true },
      });
      session.user.customImage = dbUser?.customImage ?? null;
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
          .catch((err) => console.error("[authjs] createUser slug generation failed:", err));
      }
      // Notifica admin quando un nuovo utente si registra
      sendPushToAll(
        {
          title: "👤 Nuovo utente",
          body: `${user.name ?? user.email} si è registrato ed è in attesa di conferma.`,
          url: "/admin/utenti",
        },
        true // solo admin
      ).catch(() => {});
    },
  },
  pages: {
    signIn: "/login",
    verifyRequest: "/login/verifica",
  },
});
