/**
 * Genera il documento per la revisione dei testi facili con il club (UX-21).
 *
 *   npx tsx docs/ux-audit/revisione-club/genera-testi.ts
 *
 * Legge i testi dalla fonte (dizionario italiano e `baskinInfo.ts`) e scrive
 * `testi-da-rivedere.md` qui accanto, con una colonna vuota per le correzioni
 * a mano. Dopo aver riportato le correzioni nel codice, rilanciarlo: il
 * documento torna a coincidere con il sito.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getBaskinRules, getRolesInfo } from "../../../src/lib/content/baskinInfo";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..");
const it = JSON.parse(readFileSync(join(ROOT, "src/i18n/messages/it.json"), "utf8"));

type Dict = Record<string, unknown>;

/**
 * Rende leggibile un messaggio ICU con `select`: la forma per chi legge
 * ("Hai giocato…") e, tra parentesi, quella usata per un figlio o per un altro
 * giocatore. Gli altri segnaposto restano come {nome}.
 */
function readable(msg: string): string {
  const m = msg.match(/^\{who, select, (\w+) \{(.*)\} other \{(.*)\}\}$/s);
  if (!m) return msg.replace(/\{name\}/g, "{nome}");
  const [, key, first, other] = m;
  const self = key === "self" ? first : other;
  const third = key === "self" ? other : first;
  return `${readable(self)} _(per un figlio o un altro giocatore: ${readable(third)})_`;
}

const row = (cells: string[]) => `| ${cells.map((c) => c.replace(/\|/g, "\\|")).join(" | ")} |`;
const table = (head: string[], rows: string[][]) =>
  [row(head), row(head.map(() => "---")), ...rows.map(row)].join("\n");

const out: string[] = [];
out.push("# Testi da rivedere con il club");
out.push("");
out.push(
  "Documento per la revisione di UX-21. Sono i testi che leggono gli atleti e le famiglie, scritti in linguaggio facile: frasi brevi, una informazione per frase, cosa fa il giocatore e non cosa non può fare."
);
out.push("");
out.push(
  "**Come usarlo:** leggere ogni riga; se il testo va bene lasciare vuota l'ultima colonna, altrimenti scrivere la correzione. Si può stampare. Il documento è generato dal codice del sito (`genera-testi.ts`): quello che si legge qui è quello che c'è online."
);
out.push("");
out.push("Revisione a cura di: ______________________ Data: ____________");
out.push("");

// ── 1. Varianti di ruolo ────────────────────────────────────────────────────
out.push("## 1. Varianti di ruolo (da decidere)");
out.push("");
out.push(
  "Oggi sono scritte in linguaggio clinico e le vede l'atleta nel risultato del questionario e nel profilo. La proposta dice cosa fa il giocatore. **Attenzione:** la variante ha un effetto sul regolamento, il nuovo testo non deve cambiarne il senso."
);
out.push("");
const VARIANT_PROPOSALS: Record<string, string> = {
  variantS: "si muove con più fatica e tiene il suo ritmo",
  variantT: "gioca con un tutor accanto",
  variantP: "tira con un aiuto per braccia e mani",
  variantR: "cammina e fa brevi corse",
};
out.push(
  table(
    ["Variante", "Testo attuale", "Proposta", "Decisione del club"],
    Object.entries(VARIANT_PROPOSALS).map(([key, proposal]) => [
      key.replace("variant", ""),
      String((it.roles as Dict)[key]),
      proposal,
      "",
    ])
  )
);
out.push("");

// ── 2. I 5 ruoli ────────────────────────────────────────────────────────────
out.push("## 2. I 5 ruoli (pagina Il Baskin)");
out.push("");
for (const r of getRolesInfo("it")) {
  out.push(`### ${r.label}`);
  out.push("");
  out.push(
    table(
      ["Frase", "Correzione"],
      r.summary.map((s) => [s, ""])
    )
  );
  out.push("");
}

// ── 3. Regole ───────────────────────────────────────────────────────────────
out.push("## 3. Le regole in breve");
out.push("");
for (const rule of getBaskinRules("it")) {
  out.push(`### ${rule.title}`);
  out.push("");
  out.push(
    table(
      ["Frase", "Correzione"],
      rule.items.map((s) => [s, ""])
    )
  );
  out.push("");
}

// ── 4. Questionario del ruolo ───────────────────────────────────────────────
out.push("## 4. Questionario per trovare il ruolo");
out.push("");
out.push(
  "Le domande cambiano in base alle risposte. Tra parentesi la forma usata quando un genitore compila per il figlio."
);
out.push("");
const q = it.trainings.questionnaire as Dict;
const qRows: string[][] = [];
for (const [key, value] of Object.entries(q)) {
  if (key === "progressLabel") continue;
  if (typeof value === "string") {
    qRows.push([key === "intro" ? "Introduzione" : "Nota", readable(value), ""]);
    continue;
  }
  const step = value as Dict;
  qRows.push(["**Domanda**", readable(String(step.question)), ""]);
  for (const [k, v] of Object.entries(step)) {
    if (k !== "question") qRows.push(["Risposta", readable(String(v)), ""]);
  }
}
out.push(table(["", "Testo", "Correzione"], qRows));
out.push("");

// ── 5. Traguardi ────────────────────────────────────────────────────────────
out.push("## 5. Traguardi");
out.push("");
out.push(
  "Per ogni traguardo: il nome, cosa serve per ottenerlo e la frase che compare quando è raggiunto."
);
out.push("");
const badges = it.badges as Record<string, Dict>;
out.push(
  table(
    ["Nome", "Come si ottiene", "Quando è raggiunto", "Correzione"],
    Object.values(badges)
      .filter((b) => typeof b === "object" && b.label)
      .map((b) => [String(b.label), String(b.description), readable(String(b.achieved)), ""])
  )
);
out.push("");

// ── 6. Lettura con gli atleti ───────────────────────────────────────────────
out.push("## 6. Lettura con 2-3 atleti e il loro tutor");
out.push("");
out.push(
  "Far leggere all'atleta le sezioni 2, 4 e 5 (o leggergliele). Annotare dove si ferma, cosa chiede, cosa capisce in modo diverso."
);
out.push("");
out.push(
  table(
    ["Atleta (iniziali)", "Ruolo", "Dove si è fermato / cosa ha chiesto", "Cosa cambiare"],
    [
      ["", "", "", ""],
      ["", "", "", ""],
      ["", "", "", ""],
    ]
  )
);
out.push("");

writeFileSync(join(HERE, "testi-da-rivedere.md"), out.join("\n"));
console.log("Scritto docs/ux-audit/revisione-club/testi-da-rivedere.md");
