"use server";

import { Resend } from "resend";
import { getLocale } from "next-intl/server";
import ContactNotificationEmail from "@/emails/ContactNotificationEmail";
import ContactConfirmationEmail from "@/emails/ContactConfirmationEmail";

// In-memory rate limit: max 3 submissions per IP per 10 minutes
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 3) return false;
  entry.count++;
  return true;
}

export interface ContactFormState {
  success?: boolean;
  error?: string;
}

const ERRORS = {
  it: {
    rateLimit: "Troppi messaggi inviati. Riprova tra qualche minuto.",
    nameMissing: "Inserisci il tuo nome.",
    emailInvalid: "Email non valida.",
    messageTooShort: "Il messaggio è troppo breve.",
    messageTooLong: "Il messaggio è troppo lungo (max 2000 caratteri).",
    sendError: "Errore nell'invio. Riprova o contattaci direttamente via email.",
  },
  en: {
    rateLimit: "Too many messages sent. Please try again in a few minutes.",
    nameMissing: "Please enter your name.",
    emailInvalid: "Invalid email address.",
    messageTooShort: "Your message is too short.",
    messageTooLong: "Your message is too long (max 2000 characters).",
    sendError: "Send error. Please try again or contact us directly by email.",
  },
};

export async function submitContactForm(
  prevState: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const { headers } = await import("next/headers");
  const [headersList, locale] = await Promise.all([headers(), getLocale()]);
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const err = locale === "en" ? ERRORS.en : ERRORS.it;

  if (!checkRateLimit(ip)) {
    return { error: err.rateLimit };
  }

  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const email = (formData.get("email") as string | null)?.trim() ?? "";
  const message = (formData.get("message") as string | null)?.trim() ?? "";

  if (!name || name.length < 2) return { error: err.nameMissing };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: err.emailInvalid };
  if (!message || message.length < 10) return { error: err.messageTooShort };
  if (message.length > 2000) return { error: err.messageTooLong };

  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.CONTACT_EMAIL ?? "asdkaribubaskin@gmail.com";
  const fromAddress = "Sito Karibu Baskin <noreply@karibubaskin.it>";

  if (!apiKey) {
    console.log("[ContactForm]", { name, email, message });
    return { success: true };
  }

  const resend = new Resend(apiKey);

  // 1. Notifica alla società (sempre italiano — va agli admin)
  const { error } = await resend.emails.send({
    from: fromAddress,
    to: [toEmail],
    replyTo: email,
    subject: `Nuovo messaggio dal sito — ${name}`,
    react: ContactNotificationEmail({ senderName: name, senderEmail: email, message }),
  });

  if (error) {
    console.error("[ContactForm] Resend error", error);
    return { error: err.sendError };
  }

  // 2. Conferma automatica al mittente nella sua lingua (fire-and-forget)
  const confirmSubject =
    locale === "en"
      ? "We received your message — Karibu Baskin"
      : "Abbiamo ricevuto il tuo messaggio — Karibu Baskin";

  resend.emails
    .send({
      from: fromAddress,
      to: [email],
      subject: confirmSubject,
      react: ContactConfirmationEmail({ senderName: name, message, locale }),
    })
    .catch(() => {});

  return { success: true };
}
