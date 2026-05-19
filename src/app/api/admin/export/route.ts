import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { logAudit } from "@/lib/audit";
import { ROLE_LABELS, GENDER_LABELS, sportRoleLabel } from "@/lib/constants";
import type { AppRole, Gender } from "@prisma/client";

// Prefixes formula-trigger characters to prevent CSV injection in Excel/Sheets.
// Trim leading whitespace first — " =cmd" would otherwise bypass a prefix-only check.
function sanitizeCsvValue(s: string): string {
  const trimmed = s.trimStart();
  return /^[=+\-@\t\r]/.test(trimmed) ? `'${s}` : s;
}

function csvRow(values: (string | number | null | undefined)[]): string {
  return values
    .map((v) => {
      const s = v == null ? "" : String(v);
      return `"${sanitizeCsvValue(s).replace(/"/g, '""')}"`;
    })
    .join(";");
}

function csvResponse(rows: string[], filename: string): NextResponse {
  const bom = "\uFEFF"; // BOM for Excel UTF-8
  const content = bom + rows.join("\r\n");
  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

const APP_ROLE_IT: Record<AppRole, string> = {
  GUEST: "Ospite",
  ATHLETE: "Atleta",
  PARENT: "Genitore",
  COACH: "Coach",
  ADMIN: "Admin",
};

const GENDER_IT: Record<Gender, string> = {
  MALE: "M",
  FEMALE: "F",
};

// GET /api/admin/export?type=rosa|presenze|stats&season=2025-26&teamId=xxx
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const type = req.nextUrl.searchParams.get("type") ?? "rosa";
  const season = req.nextUrl.searchParams.get("season");
  const teamId = req.nextUrl.searchParams.get("teamId");

  // Audit: ogni export di dati personali viene registrato (GDPR).
  if (session?.user?.id) {
    logAudit({
      actorId: session.user.id,
      action: "EXPORT_PII",
      targetType: "Export",
      targetId: type,
      after: { season: season ?? null, teamId: teamId ?? null },
    }).catch(() => {});
  }

  if (season && !/^\d{4}-\d{2}$/.test(season)) {
    return NextResponse.json({ error: "Formato stagione non valido (YYYY-YY)" }, { status: 400 });
  }

  // ── Rosa giocatori ──────────────────────────────────────────────────────────
  if (type === "rosa") {
    const users = await prisma.user.findMany({
      where: { appRole: { in: ["ATHLETE", "COACH", "ADMIN"] } },
      orderBy: [{ appRole: "asc" }, { name: "asc" }],
      take: 2000, // safety cap — well above any realistic roster size
      select: {
        name: true,
        email: true,
        appRole: true,
        sportRole: true,
        sportRoleVariant: true,
        gender: true,
        birthDate: true,
        teamMemberships: {
          where: season ? { team: { season } } : undefined,
          select: { team: { select: { name: true, season: true } }, isCaptain: true },
        },
        _count: { select: { registrations: true } },
      },
    });

    const header = csvRow([
      "Nome",
      "Email",
      "Ruolo App",
      "Ruolo Baskin",
      "Genere",
      "Data nascita",
      "Squadra",
      "Allenamenti totali",
    ]);
    const rows = users.map((u) =>
      csvRow([
        u.name,
        u.email,
        APP_ROLE_IT[u.appRole as AppRole],
        u.sportRole ? sportRoleLabel(u.sportRole, u.sportRoleVariant ?? null) : "",
        u.gender ? GENDER_IT[u.gender] : "",
        u.birthDate ? u.birthDate.toISOString().slice(0, 10) : "",
        u.teamMemberships
          .map((m) => `${m.team.name} (${m.team.season})${m.isCaptain ? " ★" : ""}`)
          .join(", "),
        u._count.registrations,
      ])
    );

    return csvResponse([header, ...rows], `rosa${season ? `-${season}` : ""}.csv`);
  }

  // ── Presenze allenamenti ────────────────────────────────────────────────────
  if (type === "presenze") {
    const sessions = await prisma.trainingSession.findMany({
      where: season
        ? {
            date: {
              // +02:00 (CEST) so the boundary falls at midnight Italy time, not UTC midnight.
              gte: new Date(`${season.split("-")[0]}-08-01T00:00:00+02:00`),
              lt: new Date(`20${season.split("-")[1]}-08-01T00:00:00+02:00`),
            },
          }
        : undefined,
      take: 5000,
      orderBy: { date: "desc" },
      select: {
        title: true,
        date: true,
        registrations: {
          select: {
            name: true,
            role: true,
            registeredAsCoach: true,
            user: { select: { email: true } },
          },
        },
      },
    });

    const header = csvRow(["Data", "Allenamento", "Atleta", "Email", "Ruolo Baskin", "Tipo"]);
    const rows: string[] = [];
    for (const s of sessions) {
      for (const r of s.registrations) {
        rows.push(
          csvRow([
            s.date.toISOString().slice(0, 10),
            s.title,
            r.name,
            r.user?.email ?? "",
            r.registeredAsCoach
              ? "Allenatore"
              : (ROLE_LABELS[r.role as keyof typeof ROLE_LABELS] ?? String(r.role)),
            r.registeredAsCoach ? "Coach" : "Atleta",
          ])
        );
      }
    }

    return csvResponse([header, ...rows], `presenze${season ? `-${season}` : ""}.csv`);
  }

  // ── Statistiche partite ─────────────────────────────────────────────────────
  if (type === "stats") {
    const stats = await prisma.playerMatchStats.findMany({
      where: {
        ...(season ? { match: { team: { season } } } : {}),
        ...(teamId ? { match: { teamId } } : {}),
        userId: { not: null },
      },
      include: {
        user: { select: { name: true, email: true, sportRole: true, sportRoleVariant: true } },
        match: {
          select: {
            date: true,
            team: { select: { name: true } },
            opponent: { select: { name: true } },
            result: true,
            ourScore: true,
            theirScore: true,
          },
        },
      },
      orderBy: { match: { date: "desc" } },
      take: 50000,
    });

    const header = csvRow([
      "Data",
      "Squadra",
      "Avversario",
      "Risultato",
      "Giocatore",
      "Email",
      "Ruolo",
      "Punti",
      "Canestri",
      "Assist",
      "Rimbalzi",
      "Falli",
    ]);
    const rows = stats.map((s) =>
      csvRow([
        s.match.date.toISOString().slice(0, 10),
        s.match.team.name,
        s.match.opponent.name,
        s.match.result ?? "",
        s.user?.name ?? "",
        s.user?.email ?? "",
        s.user?.sportRole ? sportRoleLabel(s.user.sportRole, s.user.sportRoleVariant ?? null) : "",
        s.points,
        s.baskets,
        s.assists,
        s.rebounds,
        s.fouls,
      ])
    );

    return csvResponse([header, ...rows], `statistiche${season ? `-${season}` : ""}.csv`);
  }

  return NextResponse.json(
    { error: "Tipo di export non valido. Usa: rosa, presenze, stats" },
    { status: 400 }
  );
}
