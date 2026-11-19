import { describe, expect, it } from "vitest";
import {
  ABANDONED_DRAFT_DAYS,
  abandonedDraftsWhere,
  canAdoptProposal,
  canEditProposal,
  canPropose,
  canStaffEditProposal,
  canSubmitProposal,
  canWithdrawProposal,
  isProposalKind,
  pendingProposals,
  proposalAuthorLabel,
  proposalState,
  type ProposalFields,
} from "./proposals";

const NOW = new Date("2026-11-19T12:00:00Z");

const draft: ProposalFields = {
  status: "PROPOSED",
  createdById: "u1",
  proposedAt: null,
  adoptedAt: null,
  archivedAt: null,
};
const sent = { ...draft, proposedAt: NOW };
const declined = { ...sent, archivedAt: NOW };
const adopted = { ...sent, status: "DRAFT" as const, adoptedAt: NOW };
const published = { ...adopted, status: "PUBLISHED" as const };

describe("chi propone e cosa", () => {
  it("solo i tesserati", () => {
    expect(canPropose("ATHLETE")).toBe(true);
    expect(canPropose("PARENT")).toBe(true);
    expect(canPropose("DIRECTOR")).toBe(true);
    expect(canPropose("GUEST")).toBe(false);
    expect(canPropose(null)).toBe(false);
  });

  it("solo esercizi, mai schemi", () => {
    expect(isProposalKind("EXERCISE")).toBe(true);
    expect(isProposalKind("WARMUP")).toBe(true);
    expect(isProposalKind("ATTACK")).toBe(false);
    expect(isProposalKind("SET_PLAY")).toBe(false);
  });
});

describe("stato di una proposta", () => {
  it("dal disegno al Playbook", () => {
    expect(proposalState(draft)).toBe("draft");
    expect(proposalState(sent)).toBe("sent");
    expect(proposalState(declined)).toBe("declined");
    expect(proposalState(adopted)).toBe("adopted");
    expect(proposalState(published)).toBe("published");
    expect(proposalState({ ...published, archivedAt: NOW })).toBe("adopted");
  });
});

describe("cosa puo' fare l'autore", () => {
  it("modifica finche' non e' adottata ne' archiviata", () => {
    expect(canEditProposal(draft, "u1")).toBe(true);
    expect(canEditProposal(sent, "u1")).toBe(true);
    expect(canEditProposal(declined, "u1")).toBe(false);
    expect(canEditProposal(adopted, "u1")).toBe(false);
    expect(canEditProposal(draft, "u2")).toBe(false);
    expect(canEditProposal(draft, null)).toBe(false);
  });

  it("invia una volta sola", () => {
    expect(canSubmitProposal(draft, "u1")).toBe(true);
    expect(canSubmitProposal(sent, "u1")).toBe(false);
  });

  it("ritira anche dopo un 'Non adesso', mai dopo l'adozione", () => {
    expect(canWithdrawProposal(declined, "u1")).toBe(true);
    expect(canWithdrawProposal(adopted, "u1")).toBe(false);
    expect(canWithdrawProposal(sent, "u2")).toBe(false);
  });

  it("lo staff corregge solo una proposta inviata e non adottata", () => {
    expect(canStaffEditProposal(draft)).toBe(false);
    expect(canStaffEditProposal(sent)).toBe(true);
    expect(canStaffEditProposal(declined)).toBe(true);
    expect(canStaffEditProposal(adopted)).toBe(false);
  });

  it("lo staff adotta solo una proposta inviata", () => {
    expect(canAdoptProposal(draft)).toBe(false);
    expect(canAdoptProposal(sent)).toBe(true);
    expect(canAdoptProposal(declined)).toBe(true);
    expect(canAdoptProposal(adopted)).toBe(false);
  });
});

describe("limite delle proposte in attesa", () => {
  it("contano bozze e inviate, non quelle decise", () => {
    expect(pendingProposals([draft, sent, declined, adopted, published])).toEqual([draft, sent]);
  });
});

describe("bozze abbandonate", () => {
  it("mai inviate e ferme da 60 giorni", () => {
    const where = abandonedDraftsWhere(NOW);
    expect(where.status).toBe("PROPOSED");
    expect(where.proposedAt).toBeNull();
    const days = (NOW.getTime() - where.updatedAt.lt.getTime()) / 86_400_000;
    expect(days).toBe(ABANDONED_DRAFT_DAYS);
  });
});

describe("riga 'Idea di …'", () => {
  const drill = { adoptedAt: NOW, showAuthor: true, isPublic: false };
  const adult = { name: "Marco Rossi", birthDate: new Date("1990-01-01") };
  const member = { member: true };

  it("il nome di battesimo, ai tesserati", () => {
    expect(proposalAuthorLabel(drill, adult, member, NOW)).toBe("Marco");
    expect(proposalAuthorLabel(drill, { ...adult, birthDate: null }, member, NOW)).toBe("Marco");
  });

  it("mai a chi non e' tesserato", () => {
    expect(proposalAuthorLabel(drill, adult, { member: false }, NOW)).toBeNull();
  });

  it("mai su un esercizio pubblico", () => {
    expect(proposalAuthorLabel({ ...drill, isPublic: true }, adult, member, NOW)).toBeNull();
  });

  it("mai per un minore", () => {
    const minor = { name: "Luca", birthDate: new Date("2014-05-01") };
    expect(proposalAuthorLabel(drill, minor, member, NOW)).toBeNull();
  });

  it("mai se l'autore l'ha spenta, o senza adozione", () => {
    expect(proposalAuthorLabel({ ...drill, showAuthor: false }, adult, member, NOW)).toBeNull();
    expect(proposalAuthorLabel({ ...drill, adoptedAt: null }, adult, member, NOW)).toBeNull();
    expect(proposalAuthorLabel(drill, null, member, NOW)).toBeNull();
    expect(proposalAuthorLabel(drill, { name: "  ", birthDate: null }, member, NOW)).toBeNull();
  });
});
