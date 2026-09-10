import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { slugify } from "@/lib/slugUtils";
import { notMinorFilter, notMinorFilterChild } from "@/lib/minors";

// Ricerca globale pubblica su giocatori, squadre, avversarie, news ed eventi.
// Privacy: esclude gli account GUEST e i minorenni. Per gli `User` la minore età
// si calcola da `birthDate` e chi non ce l'ha è trattato come adulto; per i
// `Child` vale il default opposto — senza data di nascita si presume minorenne,
// perché quel record esiste proprio perché l'atleta è gestito da un genitore.
// Un `Child` con data di nascita che lo colloca sopra i 18 anni compare
// regolarmente: è un adulto senza account, non un minore. Vedi @/lib/minors.
export async function GET(req: NextRequest) {
  const rl = checkRateLimit(getClientIp(req), "global-search", 40, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Troppe richieste" }, { status: 429 });

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ players: [], teams: [], opponents: [], news: [], events: [] });
  }

  // Regola condivisa con sitemap e profilo pubblico (@/lib/minors).
  const notMinor = notMinorFilter();
  const nameMatch = { name: { contains: q, mode: "insensitive" as const } };

  const [users, children, teams, opponents, posts, events] = await Promise.all([
    prisma.user.findMany({
      where: { AND: [nameMatch, notMinor, { appRole: { not: "GUEST" } }] },
      select: { id: true, name: true, slug: true, image: true, customImage: true, sportRole: true },
      take: 5,
    }),
    prisma.child.findMany({
      // Regola dedicata ai Child: senza data di nascita si presume minorenne.
      where: { AND: [nameMatch, notMinorFilterChild(), { slug: { not: null } }] },
      select: { id: true, name: true, slug: true, sportRole: true },
      take: 5,
    }),
    prisma.competitiveTeam.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      select: { id: true, name: true, season: true },
      orderBy: { season: "desc" },
      take: 5,
    }),
    prisma.opposingTeam.findMany({
      where: { AND: [{ name: { contains: q, mode: "insensitive" } }, { slug: { not: null } }] },
      select: { id: true, name: true, slug: true, imageUrl: true },
      take: 5,
    }),
    prisma.post.findMany({
      where: {
        AND: [
          { title: { contains: q, mode: "insensitive" } },
          { publishedAt: { lte: new Date() } },
        ],
      },
      select: { slug: true, title: true },
      orderBy: { publishedAt: "desc" },
      take: 5,
    }),
    prisma.event.findMany({
      where: { title: { contains: q, mode: "insensitive" } },
      select: { id: true, slug: true, title: true },
      orderBy: { date: "desc" },
      take: 5,
    }),
  ]);

  const players = [
    ...users.map((u) => ({
      name: u.name ?? "—",
      href: `/giocatori/${u.slug ?? u.id}`,
      image: u.customImage ?? u.image ?? null,
      sportRole: u.sportRole,
    })),
    ...children.map((c) => ({
      name: c.name,
      href: `/giocatori/${c.slug}`,
      image: null,
      sportRole: c.sportRole,
    })),
  ].slice(0, 6);

  return NextResponse.json({
    players,
    teams: teams.map((t) => ({
      name: t.name,
      season: t.season,
      href: `/squadre/${t.season.replace("-", "")}/${slugify(t.name)}`,
    })),
    opponents: opponents.map((o) => ({
      name: o.name,
      href: `/avversarie/${o.slug}`,
      image: o.imageUrl ?? null,
    })),
    news: posts.map((p) => ({ name: p.title, href: `/news/${p.slug}` })),
    events: events.map((e) => ({ name: e.title, href: `/eventi/${e.slug ?? e.id}` })),
  });
}
