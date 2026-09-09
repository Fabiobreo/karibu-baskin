import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/authjs";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

// Export GDPR Art. 20 — restituisce in JSON tutti i dati personali dell'utente
// loggato e dei suoi figli (collegati come PARENT). Esclude i token OAuth
// (Account) e le sessioni Auth.js perché non sono "dati personali forniti
// dall'utente" ai sensi dell'art. 20 e contengono segreti.

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const rl = checkRateLimit(getClientIp(req), `gdpr-export:${session.user.id}`, 3, 60 * 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Troppe richieste. Riprova tra un'ora." }, { status: 429 });
  }

  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      image: true,
      createdAt: true,
      appRole: true,
      slug: true,
      sportRole: true,
      sportRoleVariant: true,
      gender: true,
      birthDate: true,
      sportRoleSuggested: true,
      sportRoleSuggestedVariant: true,
      notifPrefs: true,
      sportRoleHistory: {
        orderBy: { changedAt: "desc" },
        select: { sportRole: true, changedAt: true },
      },
      pushSubscriptions: {
        select: { endpoint: true, createdAt: true },
      },
      teamMemberships: {
        select: {
          isCaptain: true,
          createdAt: true,
          team: { select: { name: true, season: true, championship: true } },
        },
      },
      registrations: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          role: true,
          note: true,
          anonymousEmail: true,
          registeredAsCoach: true,
          attended: true,
          createdAt: true,
          session: {
            select: { id: true, title: true, date: true, endTime: true },
          },
        },
      },
      matchStats: {
        select: {
          points: true,
          twoPointers: true,
          threePointers: true,
          freeThrows: true,
          fouls: true,
          illegalFouls: true,
          shotsAttempted: true,
          notes: true,
          isLoan: true,
          match: {
            select: {
              id: true,
              date: true,
              isHome: true,
              ourScore: true,
              theirScore: true,
              result: true,
              matchType: true,
              team: { select: { name: true, season: true } },
              opponent: { select: { name: true } },
              opponentTeam: { select: { name: true, season: true } },
            },
          },
        },
      },
      callups: {
        select: {
          isLoan: true,
          match: {
            select: {
              id: true,
              date: true,
              team: { select: { name: true, season: true } },
              opponent: { select: { name: true } },
              opponentTeam: { select: { name: true, season: true } },
            },
          },
          team: { select: { name: true, season: true } },
        },
      },
      notificationReads: {
        select: {
          readAt: true,
          notification: {
            select: { type: true, title: true, body: true, url: true, createdAt: true },
          },
        },
      },
      targetedNotifications: {
        select: { type: true, title: true, body: true, url: true, createdAt: true },
      },
      sentLinkRequests: {
        select: {
          status: true,
          createdAt: true,
          expiresAt: true,
          child: { select: { name: true } },
          targetUser: { select: { name: true, email: true } },
        },
      },
      receivedLinkRequests: {
        select: {
          status: true,
          createdAt: true,
          expiresAt: true,
          child: { select: { name: true } },
          parent: { select: { name: true, email: true } },
        },
      },
      children: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          sportRole: true,
          sportRoleVariant: true,
          gender: true,
          birthDate: true,
          createdAt: true,
          parentalConsentAt: true,
          userId: true,
          teamMemberships: {
            select: {
              isCaptain: true,
              createdAt: true,
              team: { select: { name: true, season: true, championship: true } },
            },
          },
          registrations: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              name: true,
              role: true,
              note: true,
              attended: true,
              createdAt: true,
              session: { select: { id: true, title: true, date: true, endTime: true } },
            },
          },
          matchStats: {
            select: {
              points: true,
              twoPointers: true,
              threePointers: true,
              freeThrows: true,
              fouls: true,
              illegalFouls: true,
              shotsAttempted: true,
              notes: true,
              isLoan: true,
              match: {
                select: {
                  id: true,
                  date: true,
                  isHome: true,
                  ourScore: true,
                  theirScore: true,
                  result: true,
                  matchType: true,
                  team: { select: { name: true, season: true } },
                  opponent: { select: { name: true } },
                  opponentTeam: { select: { name: true, season: true } },
                },
              },
            },
          },
          callups: {
            select: {
              isLoan: true,
              match: {
                select: {
                  id: true,
                  date: true,
                  team: { select: { name: true, season: true } },
                  opponent: { select: { name: true } },
                  opponentTeam: { select: { name: true, season: true } },
                },
              },
              team: { select: { name: true, season: true } },
            },
          },
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
  }

  const payload = {
    exportInfo: {
      generatedAt: new Date().toISOString(),
      basis: "GDPR Art. 20: diritto alla portabilità dei dati",
      scope:
        "Dati personali dell'utente loggato e dei figli a lui collegati. Esclusi token OAuth e sessioni Auth.js.",
      app: "Karibu Baskin",
    },
    user,
  };

  const filenameDate = new Date().toISOString().slice(0, 10);
  const safeEmail = user.email.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filename = `karibu-baskin-export-${safeEmail}-${filenameDate}.json`;

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
