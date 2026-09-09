/**
 * Invio del "magic link" di accesso (provider Resend di Auth.js).
 *
 * Perché esiste: il login con Google copre la maggior parte degli utenti, ma
 * una parte della rosa usa indirizzi Alice/Libero/Yahoo/Hotmail, che non sono
 * account Google e quindi non potrebbero MAI entrare con il solo OAuth.
 * Il link via email funziona con qualsiasi dominio e non introduce password.
 *
 * Qui sovrascriviamo `sendVerificationRequest` del provider per usare il
 * template React Email del progetto invece di quello generico di Auth.js.
 */
import { Resend } from "resend";
import type { EmailProviderSendVerificationRequestParams } from "@auth/core/providers/email";
import MagicLinkEmail from "@/emails/MagicLinkEmail";
import { checkRateLimit } from "@/lib/rateLimit";
import { LOCALE_COOKIE, DEFAULT_LOCALE, isValidLocale } from "@/i18n/locales";

/** Validità del link, in ore. Auth.js lo invalida comunque dopo il primo uso. */
export const MAGIC_LINK_MAX_AGE_HOURS = 24;
export const MAGIC_LINK_MAX_AGE_SECONDS = MAGIC_LINK_MAX_AGE_HOURS * 60 * 60;

/** Mittente: sovrascrivibile via env quando cambia il dominio verificato su Resend. */
export const AUTH_EMAIL_FROM =
  process.env.AUTH_EMAIL_FROM ?? "Karibu Baskin <noreply@karibubaskin.it>";

/** Max richieste di link per indirizzo, nella finestra sotto. */
const MAX_REQUESTS_PER_EMAIL = 5;
const RATE_WINDOW_MS = 15 * 60 * 1000;

/**
 * Legge la lingua scelta dall'utente dal cookie next-intl della richiesta, così
 * l'email arriva nella stessa lingua in cui stava navigando.
 */
export function localeFromRequest(req: Request | undefined): string {
  const cookieHeader = req?.headers?.get("cookie");
  if (!cookieHeader) return DEFAULT_LOCALE;
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === LOCALE_COOKIE) {
      const value = decodeURIComponent(rest.join("="));
      if (isValidLocale(value)) return value;
    }
  }
  return DEFAULT_LOCALE;
}

/** Oggetto dell'email, nella lingua dell'utente. */
export function magicLinkSubject(locale: string): string {
  return locale === "en"
    ? "Your Karibu Baskin sign-in link"
    : "Il tuo link di accesso a Karibu Baskin";
}

export async function sendMagicLinkEmail(params: EmailProviderSendVerificationRequestParams) {
  const { identifier, url, request } = params;
  const email = identifier.trim().toLowerCase();

  // Limite per indirizzo: evita che qualcuno usi il form per inondare la casella
  // di un terzo. Non blocca l'utente legittimo che sbaglia e riprova.
  const rl = checkRateLimit(email, "magic-link", MAX_REQUESTS_PER_EMAIL, RATE_WINDOW_MS);
  if (!rl.allowed) {
    throw new Error(
      "Troppe richieste di accesso per questo indirizzo. Riprova tra un quarto d'ora."
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // In sviluppo senza Resend configurato, stampiamo il link in console così il
    // flusso resta testabile. Mai in produzione: finirebbe nei log un accesso valido.
    if (process.env.NODE_ENV !== "production") {
      console.log(`[magic-link] ${email} → ${url}`);
      return;
    }
    throw new Error("RESEND_API_KEY mancante: impossibile inviare il link di accesso.");
  }

  const locale = localeFromRequest(request);
  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from: AUTH_EMAIL_FROM,
    to: [email],
    subject: magicLinkSubject(locale),
    react: MagicLinkEmail({ url, expiresInHours: MAGIC_LINK_MAX_AGE_HOURS, locale }),
  });

  if (error) {
    console.error("[magic-link] Resend error", error);
    throw new Error("Invio del link non riuscito. Riprova tra poco.");
  }
}
