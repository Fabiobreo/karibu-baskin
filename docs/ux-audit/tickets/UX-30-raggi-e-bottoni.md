# UX-30 · Raggi (moltiplicatore del tema) e bottoni 3 × 2 senza alone

**Ondata:** 4 · **Stima:** M · **Dipende da:** nessuno · **Stato:** da fare

## Problema

**Raggi.** `src/theme.ts:437` imposta `shape.borderRadius: 10`. Negli `sx` MUI moltiplica i numeri per questo valore, quindi:

- `borderRadius: 2` = **20 px** (67 usi);
- `borderRadius: 3` = **30 px** (26 usi);
- ci sono anche `1.5` (15 px), `999`, `24`, `"6px"`, `"10px"`.

Card e Paper del tema invece sono a **14 px** (`MuiCard`/`MuiPaper`), i bottoni a 8, gli input a 8, i chip a 6. Effetto misurato: in `/allenamenti` convivono card a 14 e a 20 px; le card degli eventi sono a 30 px; nell'RSVP una card a 30 contiene card a 20; la FAQ ha 10 px e il calendario 4.

**Bottoni.** Misurati 5 stili in home e 6 in `/contatti`:

- pieno con alone arancione (`boxShadow` colorato) negli hero, "Scrivici", "Vieni a provare", "Gioca";
- pieno da 28 px con freccia ("Iscriviti →" nelle card allenamento);
- contornato arancione;
- fantasma bianco negli hero;
- testo arancione usato come azione **primaria** ("Mandami un link di accesso" nel login, "Tutti" nelle convocazioni);
- pillole grandi nella dashboard admin.

L'alone colorato è l'elemento che più di tutti fa sembrare il sito una landing da template.

## Cosa fare

1. **Raggi:**
   - `shape.borderRadius: 4`, così i numeri degli `sx` tornano alla scala di 4 px (2 = 8, 3 = 12, 4 = 16); oppure token espliciti `radius.{sm: 6, md: 10, lg: 14, pill: 999}` esposti dal tema.
   - Migrare gli `sx` esistenti mantenendo l'aspetto voluto: card → 14 (dal tema, senza `borderRadius` locale), elementi interni → 8-10, pillole → `pill`.
   - Regola ESLint (come per `fontSize`) che vieta i numeri letterali in `borderRadius` fuori dal tema.
2. **Bottoni**, nel tema (`MuiButton`):
   - tre enfasi: `contained` (una per schermata, l'azione primaria), `outlined` (secondaria), `text` (terziaria, mai l'unica azione di un modulo);
   - due taglie: 40 px (default) e 48 px (`large`, CTA di pagina e invio dei moduli). Niente bottoni da 28 px per azioni primarie;
   - nessun `boxShadow` colorato in nessuno stato; sollevamento, se serve, con le ombre del tema;
   - freccia "→" solo nei link testuali ("Vedi tutte →"), mai dentro un bottone pieno;
   - variante fantasma per gli hero scuri definita una volta nel tema (`variant="outlined" color="inherit"` o variante dedicata), non riscritta negli `sx`.
3. **Casi noti da sistemare:**
   - "Mandami un link di accesso" (`MagicLinkForm`) diventa `outlined` a tutta larghezza, stessa forma di "Accedi con Google";
   - "Iscriviti →" nelle card allenamento (`SessionCard`) diventa un bottone da 40 px senza freccia;
   - quick link della dashboard admin: card o righe, non pillole.

## Criteri di accettazione

- Nelle pagine pubbliche di `npm run a11y` le card hanno un solo raggio (misurato dal DOM: `getComputedStyle(...).borderRadius` sui `.MuiPaper-root` di primo livello).
- Al massimo 3 stili di bottone per pagina (enfasi × taglia contate come in `RIAUDIT-2026-09-29.md`, sezione 8).
- Nessun `boxShadow` con colore del marchio in `src/`.
- `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run a11y` verdi; schermate prima/dopo di home, `/allenamenti`, `/eventi`, `/contatti`, `/login`.
