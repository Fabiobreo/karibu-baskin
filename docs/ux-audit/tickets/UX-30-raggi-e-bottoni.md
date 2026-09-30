# UX-30 · Raggi (moltiplicatore del tema) e bottoni 3 × 2 senza alone

**Ondata:** 4 · **Stima:** M · **Dipende da:** nessuno · **Stato:** fatto (su `develop`)

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

## Decisioni e note (29/09/2026)

- **Raggi con token** `RADIUS` in `@/lib/radius` (come `TYPE_SCALE`): `sm` 6, `md` 8, `lg` 14, `pill`. `shape.borderRadius` passa da 10 a 8 (= `md`), così anche Alert, menu e tooltip di MUI stanno nella scala. Regola ESLint in `error` sui letterali in `borderRadius` dentro `sx`/`slotProps`/`PaperProps`/`MenuProps`/`InputProps` (liberi `0` e `"50%"`). Migrati 157 usi in 97 file più gli oggetti di stile fuori dal JSX; gli `style` di email e immagini OG restano in px (fuori dal tema).
- **Accordion:** un gruppo è una card, primo e ultimo a `lg` (tema).
- **Bottoni:** `disableElevation` di default, niente ombre colorate (tolte anche dagli hover di card in `/contatti`, `/sponsor`, `NextMatchCard`, dall'alone della mappa e dagli aloni pulsanti del chip "Imminente"); `minHeight` 40 / `large` 48 / `small` 32. Variante fantasma nel tema (`outlined` + `color="inherit"`, bordo e fondo in `color-mix` sul colore del testo), usata negli hero di home, `/contatti`, `/classifiche`, `/marcatori`, in `StaffManageButton` e `PlayerShareButtons`.
- **48 px solo nel sito pubblico** (decisione del 29/09): CTA di pagina e invio dei moduli pubblici (contatti, suggerimenti, iscrizione, RSVP, login, FAQ, news, gallery, ruolo, prossima azione). L'admin resta a 40.
- **Casi noti:** "Mandami un link di accesso" è `outlined` large a tutta larghezza; "Iscriviti" nelle card allenamento è un bottone da 40 px senza freccia, e il bottone squadre accanto diventa contornato (uno solo pieno per card); "Tutti" nelle convocazioni è terziario come "Nessuno". "Scrivici" e "Mostra la mappa" in `/contatti` passano a `outlined`, così la pagina ha 3 stili (pieno 48, contornato 48, tab di testo).
- **Rimandato a UX-40:** la forma dei quick link della dashboard admin (qui solo raggi e ombre).
- **Rimandato a UX-43:** card in evidenza degli allenamenti (testata nera, corpo schiarito dall'elevazione) e "Gestisci allenamenti" su una riga propria, emersi guardando `/allenamenti` durante questo ticket.
- Misure a 1440 px, sulle pagine controllate (home, `/eventi`, `/contatti`, `/faq`, dettaglio partita): card di primo livello tutte a 14 px (nelle altre pagine misurate lo script non ha contato nessuna card: non vale come verifica); nessun bottone con ombra; stili di bottone per pagina ≤ 3 (home: pieno 48, pieno 40, contornato 48; `/contatti`: pieno 48, contornato 48, testo).
