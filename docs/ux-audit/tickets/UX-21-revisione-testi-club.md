# UX-21 · Revisione dei testi facili con il club e varianti di ruolo

**Ondata:** 3 · **Stima:** S di sviluppo, più il tempo del club · **Dipende da:** UX-17 · **Stato:** da fare, serve il club

## Problema

UX-17 ha riscritto in linguaggio facile ruoli, regole, questionario, traguardi e gergo, ma il suo criterio di accettazione principale non si chiude nel codice: i testi vanno **rivisti da una persona del club** e, se possibile, **letti da 2-3 atleti con il loro tutor**.

Restano inoltre in linguaggio clinico le varianti di ruolo (`roles.variant*` in `it.json` ed `en.json`), che l'atleta vede nel risultato del questionario e nel profilo:

| Chiave     | Testo attuale                    |
| ---------- | -------------------------------- |
| `variantS` | "con spasticità"                 |
| `variantT` | "con assistenza tutor"           |
| `variantP` | "con limitazioni arti superiori" |
| `variantR` | "con corsa limitata"             |

## Cosa fare

1. Preparare per il club un documento unico (anche da stampare) con i testi da rivedere, presi dalla fonte: `summary` dei 5 ruoli e regole in `src/lib/content/baskinInfo.ts`, `trainings.questionnaire.*`, `badges.*` (nome, criterio, frase), le forme neutre al posto delle barre oblique, `roles.variant*`.
2. Proporre per le varianti una forma che dica cosa fa il giocatore (per esempio "gioca con un tutor accanto", "tira con un aiuto per braccia e mani", "cammina e fa brevi corse"). **Decisione del club**, soprattutto per S: la variante ha un effetto sul regolamento e il testo non deve cambiarne il senso.
3. Riportare le correzioni in `it.json`, `en.json` e `baskinInfo.ts`.
4. Lettura con 2-3 atleti e tutor: annotare dove si fermano o chiedono spiegazioni, e correggere quei punti.

## Criteri di accettazione

- Testi approvati da una persona del club (nome e data annotati qui).
- Nessun termine clinico nelle varianti di ruolo mostrate agli atleti.
- Esito della lettura con gli atleti annotato qui, con le modifiche fatte.
