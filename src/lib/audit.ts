import { prisma } from "./db";

export type AuditAction =
  | "UPDATE_ROLE"
  | "UPDATE_SPORT_ROLE"
  | "DELETE_USER"
  | "DELETE_CHILD"
  | "ADD_MEMBER"
  | "REMOVE_MEMBER"
  | "CREATE_TEAM"
  | "UPDATE_TEAM"
  | "DELETE_TEAM"
  | "CREATE_MATCH"
  | "DELETE_MATCH"
  | "CREATE_EVENT"
  | "DELETE_EVENT"
  | "UPDATE_MATCH"
  | "UPDATE_EVENT"
  | "LINK_ACCEPTED"
  | "LINK_REJECTED"
  | "EXPORT_PII"
  | "DELETE_ANONYMOUS_REGS"
  | "CREATE_SESSION"
  | "UPDATE_SESSION"
  | "DELETE_SESSION"
  | "OPEN_REGISTRATIONS"
  | "CLOSE_REGISTRATIONS"
  | "CONCLUDE_SESSION"
  | "GENERATE_TEAMS"
  | "UPDATE_TEAMS"
  | "DELETE_TEAMS"
  | "CREATE_TRAINING_MATCH_RESULT"
  | "UPDATE_CALLUPS"
  | "UPDATE_MATCH_STATS"
  | "CREATE_GROUP"
  | "UPDATE_GROUP"
  | "DELETE_GROUP"
  | "CREATE_OPPOSING_TEAM"
  | "UPDATE_OPPOSING_TEAM"
  | "DELETE_OPPOSING_TEAM"
  | "DELETE_REGISTRATION";

interface LogAuditInput {
  actorId: string;
  action: AuditAction;
  targetType: string;
  targetId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}

export async function logAudit(input: LogAuditInput): Promise<void> {
  await prisma.auditEvent.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      before: (input.before ?? undefined) as object | undefined,
      after: (input.after ?? undefined) as object | undefined,
    },
  });
}
