"use server";

import { Resend } from "resend";
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

export async function submitContactForm(
  prevState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const { headers } = await import("next/headers");
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (!checkRateLimit(ip)) {
    return { error: "Troppi messaggi inviati. Riprova tra qualche minuto." };
  }

  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const email = (formData.get("email") as string | null)?.trim() ?? "";
  const message = (formData.get("message") as string | null)?.trim() ?? "";

  if (!name || name.length < 2) return { error: "Inserisci il tuo nome." };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Email non valida." };
  if (!message || message.length < 10) return { error: "Il messaggio è troppo breve." };
  if (message.length > 2000) return { error: "Il messaggio è troppo lungo (max 2000 caratteri)." };

  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.CONTACT_EMAIL ?? "asdkaribubaskin@gmail.com";
  const fromAddress = "Sito Karibu Baskin <noreply@karibubaskin.it>";

  if (!apiKey) {
    // Fallback per sviluppo senza API key configurata
    console.log("[ContactForm]", { name, email, message });
    return { success: true };
  }

  const resend = new Resend(apiKey);

  // 1. Notifica alla società con il messaggio ricevuto
  const { error } = await resend.emails.send({
    from: fromAddress,
    to: [toEmail],
    replyTo: email,
    subject: `Nuovo messaggio dal sito — ${name}`,
    react: ContactNotificationEmail({ senderName: name, senderEmail: email, message }),
  });

  if (error) {
    console.error("[ContactForm] Resend error", error);
    return { error: "Errore nell'invio. Riprova o contattaci direttamente via email." };
  }

  // 2. Conferma automatica al mittente (fire-and-forget)
  resend.emails.send({
    from: fromAddress,
    to: [email],
    subject: "Abbiamo ricevuto il tuo messaggio — Karibu Baskin",
    react: ContactConfirmationEmail({ senderName: name, message }),
  }).catch(() => {});

  return { success: true };
}
