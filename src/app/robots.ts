import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteUrl";

/**
 * Crawler esclusi da tutto il sito. Ogni pagina che leggono è una funzione
 * Vercel che gira (CPU del piano Hobby), e non portano visitatori:
 * - addestramento dei modelli AI: i profili dei giocatori non devono finire
 *   nei dati di addestramento;
 * - strumenti SEO a pagamento, che nessuno del club usa.
 * Restano liberi i motori di ricerca, i bot delle AI che cercano per conto di
 * un utente (OAI-SearchBot, ChatGPT-User, PerplexityBot, Claude-SearchBot,
 * Claude-User) e quelli delle anteprime dei link (WhatsApp, Facebook,
 * Telegram). È una richiesta, non un blocco: chi la ignora va fermato dal
 * Firewall di Vercel.
 */
export const BLOCKED_CRAWLERS = [
  // Addestramento AI
  "GPTBot",
  "ClaudeBot",
  "anthropic-ai",
  "CCBot",
  "Google-Extended",
  "Applebot-Extended",
  "Bytespider",
  "meta-externalagent",
  "Amazonbot",
  "cohere-ai",
  "cohere-training-data-crawler",
  "Diffbot",
  "ImagesiftBot",
  "omgili",
  "Timpibot",
  // Strumenti SEO
  "AhrefsBot",
  "SemrushBot",
  "MJ12bot",
  "DotBot",
  "BLEXBot",
  "DataForSeoBot",
  "barkrowler",
  "serpstatbot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/profilo", "/notifiche"],
      },
      { userAgent: BLOCKED_CRAWLERS, disallow: "/" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
