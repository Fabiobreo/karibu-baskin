import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";

// Raggruppa targetId per targetType per fare lookup batch
function groupByTargetType(items: { targetType: string; targetId: string }[]) {
  const map: Record<string, string[]> = {};
  for (const item of items) {
    if (!map[item.targetType]) map[item.targetType] = [];
    if (!map[item.targetType].includes(item.targetId)) {
      map[item.targetType].push(item.targetId);
    }
  }
  return map;
}

async function resolveTargetLabels(
  grouped: Record<string, string[]>
): Promise<Record<string, string>> {
  const result: Record<string, string> = {}; // key: "Type:id"

  await Promise.all(
    Object.entries(grouped).map(async ([type, ids]) => {
      switch (type) {
        case "User": {
          const rows = await prisma.user.findMany({
            where: { id: { in: ids } },
            select: { id: true, name: true, email: true },
          });
          rows.forEach((r) => {
            result[`User:${r.id}`] = r.name ?? r.email ?? r.id;
          });
          break;
        }
        case "Child": {
          const rows = await prisma.child.findMany({
            where: { id: { in: ids } },
            select: { id: true, name: true },
          });
          rows.forEach((r) => {
            result[`Child:${r.id}`] = r.name;
          });
          break;
        }
        case "CompetitiveTeam": {
          const rows = await prisma.competitiveTeam.findMany({
            where: { id: { in: ids } },
            select: { id: true, name: true, season: true },
          });
          rows.forEach((r) => {
            result[`CompetitiveTeam:${r.id}`] = `${r.name} (${r.season})`;
          });
          break;
        }
        case "TeamMembership": {
          const rows = await prisma.teamMembership.findMany({
            where: { id: { in: ids } },
            select: {
              id: true,
              user: { select: { name: true, email: true } },
              child: { select: { name: true } },
              team: { select: { name: true } },
            },
          });
          rows.forEach((r) => {
            const person = r.user?.name ?? r.user?.email ?? r.child?.name ?? "?";
            result[`TeamMembership:${r.id}`] = `${person} → ${r.team?.name ?? "?"}`;
          });
          break;
        }
        case "Match": {
          const rows = await prisma.match.findMany({
            where: { id: { in: ids } },
            select: { id: true, date: true, slug: true },
          });
          rows.forEach((r) => {
            const label = r.slug ?? new Date(r.date).toLocaleDateString("it-IT");
            result[`Match:${r.id}`] = label;
          });
          break;
        }
        case "Event": {
          const rows = await prisma.event.findMany({
            where: { id: { in: ids } },
            select: { id: true, title: true },
          });
          rows.forEach((r) => {
            result[`Event:${r.id}`] = r.title;
          });
          break;
        }
        case "TrainingSession": {
          const rows = await prisma.trainingSession.findMany({
            where: { id: { in: ids } },
            select: { id: true, title: true, date: true },
          });
          rows.forEach((r) => {
            result[`TrainingSession:${r.id}`] =
              `${r.title} — ${new Date(r.date).toLocaleDateString("it-IT")}`;
          });
          break;
        }
        case "Group": {
          const rows = await prisma.group.findMany({
            where: { id: { in: ids } },
            select: { id: true, name: true, season: true },
          });
          rows.forEach((r) => {
            result[`Group:${r.id}`] = `${r.name} (${r.season})`;
          });
          break;
        }
        case "OpposingTeam": {
          const rows = await prisma.opposingTeam.findMany({
            where: { id: { in: ids } },
            select: { id: true, name: true },
          });
          rows.forEach((r) => {
            result[`OpposingTeam:${r.id}`] = r.name;
          });
          break;
        }
        case "Registration": {
          const rows = await prisma.registration.findMany({
            where: { id: { in: ids } },
            select: {
              id: true,
              name: true,
              user: { select: { name: true } },
              child: { select: { name: true } },
            },
          });
          rows.forEach((r) => {
            result[`Registration:${r.id}`] = r.user?.name ?? r.child?.name ?? r.name ?? r.id;
          });
          break;
        }
      }
    })
  );

  return result;
}

export async function GET(req: NextRequest) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;

  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
  const pageSize = Math.min(100, Math.max(10, parseInt(sp.get("pageSize") ?? "25", 10)));

  const action = sp.get("action") ?? undefined;
  const targetType = sp.get("targetType") ?? undefined;
  const actorId = sp.get("actorId") ?? undefined;
  const from = sp.get("from") ?? undefined;
  const to = sp.get("to") ?? undefined;

  const where = {
    ...(action ? { action } : {}),
    ...(targetType ? { targetType } : {}),
    ...(actorId ? { actorId } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to + "T23:59:59.999Z") } : {}),
          },
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.auditEvent.count({ where }),
    prisma.auditEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  // Lookup batch attori
  const actorIds = [...new Set(items.map((e) => e.actorId).filter(Boolean))];
  const actors = actorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, name: true, email: true, appRole: true },
      })
    : [];
  const actorMap = Object.fromEntries(actors.map((a) => [a.id, a]));

  // Lookup batch target
  const grouped = groupByTargetType(items);
  const targetLabels = await resolveTargetLabels(grouped);

  const enriched = items.map((e) => ({
    ...e,
    actor: actorMap[e.actorId] ?? null,
    targetLabel: targetLabels[`${e.targetType}:${e.targetId}`] ?? null,
  }));

  return NextResponse.json({ items: enriched, total, page, pageSize });
}
