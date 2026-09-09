import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/slugUtils";
import { SITE_URL } from "@/lib/siteUrl";
import { notMinorFilter } from "@/lib/minors";

const BASE = SITE_URL;

// Senza questo la sitemap viene prerenderizzata una volta sola al build e resta
// congelata fino al deploy successivo: news, partite e allenamenti nuovi non
// comparirebbero mai. Un'ora è un buon compromesso per un sito di questa cadenza.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, priority: 1.0, changeFrequency: "weekly" },
    { url: `${BASE}/allenamenti`, priority: 0.9, changeFrequency: "daily" },
    { url: `${BASE}/calendario`, priority: 0.8, changeFrequency: "daily" },
    { url: `${BASE}/squadre`, priority: 0.8, changeFrequency: "weekly" },
    { url: `${BASE}/risultati`, priority: 0.75, changeFrequency: "weekly" },
    { url: `${BASE}/classifiche`, priority: 0.75, changeFrequency: "weekly" },
    { url: `${BASE}/marcatori`, priority: 0.7, changeFrequency: "weekly" },
    { url: `${BASE}/il-baskin`, priority: 0.6, changeFrequency: "monthly" },
    { url: `${BASE}/news`, priority: 0.6, changeFrequency: "weekly" },
    { url: `${BASE}/eventi`, priority: 0.6, changeFrequency: "weekly" },
    { url: `${BASE}/gallery`, priority: 0.55, changeFrequency: "weekly" },
    { url: `${BASE}/faq`, priority: 0.5, changeFrequency: "monthly" },
    { url: `${BASE}/contatti`, priority: 0.5, changeFrequency: "monthly" },
    { url: `${BASE}/sponsor`, priority: 0.4, changeFrequency: "monthly" },
  ];

  const [teams, players, sessions, matches, opposingTeams, posts, events] = await Promise.all([
    prisma.competitiveTeam.findMany({
      select: { name: true, season: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    // Privacy: i profili dei minorenni non finiscono in sitemap (stessa regola
    // applicata alla ricerca globale e al `noindex` sul profilo pubblico).
    prisma.user.findMany({
      where: { appRole: { not: "GUEST" }, slug: { not: null }, ...notMinorFilter() },
      select: { slug: true, createdAt: true },
    }),
    prisma.trainingSession.findMany({
      where: { date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      select: { dateSlug: true, id: true, date: true },
      orderBy: { date: "desc" },
      take: 20,
    }),
    prisma.match.findMany({
      select: { slug: true, id: true, date: true },
      orderBy: { date: "desc" },
    }),
    prisma.opposingTeam.findMany({
      where: { slug: { not: null } },
      select: { slug: true, createdAt: true },
    }),
    // Solo i post effettivamente pubblicati: le bozze non esistono per il pubblico.
    prisma.post.findMany({
      where: { publishedAt: { not: null } },
      select: { slug: true, updatedAt: true },
      orderBy: { publishedAt: "desc" },
    }),
    prisma.event.findMany({
      where: { slug: { not: null } },
      select: { slug: true, updatedAt: true },
      orderBy: { date: "desc" },
    }),
  ]);

  const teamPages: MetadataRoute.Sitemap = teams.map((t) => ({
    url: `${BASE}/squadre/${t.season.replace("-", "")}/${slugify(t.name)}`,
    lastModified: t.createdAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const playerPages: MetadataRoute.Sitemap = players
    .filter((p) => p.slug)
    .map((p) => ({
      url: `${BASE}/giocatori/${p.slug}`,
      lastModified: p.createdAt,
      changeFrequency: "weekly",
      priority: 0.65,
    }));

  const sessionPages: MetadataRoute.Sitemap = sessions.map((s) => ({
    url: `${BASE}/allenamento/${s.dateSlug ?? s.id}`,
    lastModified: s.date,
    changeFrequency: "hourly",
    priority: 0.75,
  }));

  const matchPages: MetadataRoute.Sitemap = matches.map((m) => ({
    url: `${BASE}/partite/${m.slug ?? m.id}`,
    lastModified: m.date,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const opposingTeamPages: MetadataRoute.Sitemap = opposingTeams
    .filter((t) => t.slug)
    .map((t) => ({
      url: `${BASE}/avversarie/${t.slug}`,
      lastModified: t.createdAt,
      changeFrequency: "monthly",
      priority: 0.5,
    }));

  const postPages: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${BASE}/news/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const eventPages: MetadataRoute.Sitemap = events
    .filter((e) => e.slug)
    .map((e) => ({
      url: `${BASE}/eventi/${e.slug}`,
      lastModified: e.updatedAt,
      changeFrequency: "monthly",
      priority: 0.55,
    }));

  return [
    ...staticPages,
    ...teamPages,
    ...playerPages,
    ...sessionPages,
    ...matchPages,
    ...opposingTeamPages,
    ...postPages,
    ...eventPages,
  ];
}
