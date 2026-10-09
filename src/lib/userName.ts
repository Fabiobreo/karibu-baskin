import { inBackground } from "@/lib/background";
import { prisma } from "@/lib/db";
import { generateUserSlug } from "@/lib/slugUtils";
import { sendPushToUsers } from "@/lib/notifications/webpush";
import { createTargetedAppNotifications } from "@/lib/notifications/appNotifications";
import { staffUserIds } from "@/lib/notifications/recipients";

export type SetOwnNameResult =
  | { ok: true; name: string }
  | { ok: false; status: 404; error: string };

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
 * - Vale anche con un account Google collegato: Google riempie il nome solo
 *   se manca (callback `signIn` in authjs.ts), non lo riscrive a ogni accesso.
 * - Lo slug si genera la prima volta; un cambio di nome successivo non lo
 *   tocca, per non rompere i link al profilo pubblico.
 * - La notifica "nuovo utente" allo staff parte qui, quando il nome c'è: alla
 *   creazione dell'account (vedi `createUser` in authjs.ts) avrebbe mostrato
 *   solo un indirizzo email.
 */
/**
 * Avvisa lo staff di un nuovo account da confermare: push e in-app agli
 * allenatori e agli admin, perché anche un allenatore può approvare un ospite
 * (`canAssignAppRole`).
 */
export async function notifyStaffOfNewUser(name: string): Promise<void> {
  const staffIds = await staffUserIds();
  const body = newUserPushBody(name);
  const url = "/admin/utenti";
  await Promise.all([
    sendPushToUsers(staffIds, { title: "👤 Nuovo utente", body, url }).catch((err) =>
      console.error("[push new user]", err)
    ),
    createTargetedAppNotifications(staffIds, { type: "SYSTEM", title: "Nuovo utente", body, url }),
  ]);
}

export async function setOwnName(userId: string, name: string): Promise<SetOwnNameResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, slug: true, appRole: true },
  });
  if (!user) return { ok: false, status: 404, error: "Utente non trovato" };

  const hadName = !!user.name?.trim();

  const slug = user.slug ? null : await generateUserSlug(name);
  await prisma.user.update({
    where: { id: userId },
    data: { name, ...(slug ? { slug } : {}) },
  });

  if (!hadName && user.appRole === "GUEST") {
    inBackground(notifyStaffOfNewUser(name), "notification new user");
  }

  return { ok: true, name };
}
