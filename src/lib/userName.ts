import { prisma } from "@/lib/db";
import { generateUserSlug } from "@/lib/slugUtils";
import { sendPushToAll } from "@/lib/notifications/webpush";

export type SetOwnNameResult =
  | { ok: true; name: string }
  | { ok: false; status: 403 | 404; error: string };

/**
 * Testo della notifica allo staff per un nuovo account. Neutro rispetto al
 * genere: di chi si iscrive sappiamo solo il nome.
 */
export function newUserPushBody(nameOrEmail: string): string {
  return `${nameOrEmail} ha creato un account ed è in attesa di conferma.`;
}

/**
 * Chi entra col magic link nasce senza nome: Auth.js ha solo l'email. Il nome
 * lo inserisce l'utente (dialog al primo accesso, profilo, form d'iscrizione).
 *
 * - Con un account Google collegato il nome arriva da Google e viene
 *   riscritto a ogni accesso: modificarlo qui sparirebbe al login dopo, quindi
 *   si accetta solo se manca del tutto.
 * - Lo slug si genera la prima volta; un cambio di nome successivo non lo
 *   tocca, per non rompere i link al profilo pubblico.
 * - La notifica "nuovo utente" allo staff parte qui, quando il nome c'è: alla
 *   creazione dell'account (vedi `createUser` in authjs.ts) avrebbe mostrato
 *   solo un indirizzo email.
 */
export async function setOwnName(userId: string, name: string): Promise<SetOwnNameResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      slug: true,
      appRole: true,
      accounts: { where: { provider: "google" }, select: { id: true }, take: 1 },
    },
  });
  if (!user) return { ok: false, status: 404, error: "Utente non trovato" };

  const hadName = !!user.name?.trim();
  if (hadName && user.accounts.length > 0) {
    return {
      ok: false,
      status: 403,
      error: "Il nome arriva dal tuo account Google: per cambiarlo, modificalo lì",
    };
  }

  const slug = user.slug ? null : await generateUserSlug(name);
  await prisma.user.update({
    where: { id: userId },
    data: { name, ...(slug ? { slug } : {}) },
  });

  if (!hadName && user.appRole === "GUEST") {
    sendPushToAll(
      { title: "👤 Nuovo utente", body: newUserPushBody(name), url: "/admin/utenti" },
      true // solo admin
    ).catch((err) => console.error("[push] new user", err));
  }

  return { ok: true, name };
}
