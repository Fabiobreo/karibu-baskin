# UX-50 · Partita futura per chi non è tesserato

**Ondata:** 5 · **Stima:** S · **Dipende da:** nessuno · **Stato:** fatto (03/10/2026)

Nato dal [riaudit del 02/10/2026](../RIAUDIT-2026-10-02.md), problema 7.

## Problema

`/partite/[slug]` di una partita non ancora giocata, da anonimo o da ospite:

- sotto l'intestazione ci sono le tab "Convocati" e "Statistiche"; è aperta "Convocati", che mostra un lucchetto, "Solo per i tesserati" e il bottone "Accedi". "Statistiche" è vuota finché non si gioca. La pagina non dà nient'altro;
- nel tabellino, al posto del punteggio, c'è l'orario ("15:00") con lo stesso peso di un punteggio; il luogo è una parola ("Casa").

L'audit del 24/09 aveva segnalato il lucchetto come prima impressione; UX-06 l'ha corretto per le partite giocate (si aprono su "Statistiche"), non per quelle future. Chi arriva qui da un link condiviso vuole sapere quando e dove si gioca.

## Cosa fare

1. Per chi non è tesserato, su una partita futura, niente tab: al loro posto un blocco "Dove e quando" con indirizzo, link a Google Maps (niente embed, come in UX-15) e "Aggiungi al calendario" (oggi `/api/calendar/export.ics` esporta tutto il calendario: serve il singolo impegno, o in alternativa il link all'abbonamento).
2. Sotto, una riga sola per i convocati: "I convocati li vedono i tesserati" con "Accedi" come link, non come contenuto principale della pagina.
3. Per i tesserati la pagina resta com'è.
4. I minori restano fuori da ogni superficie pubblica (`@/lib/minors`): questo ticket non mostra nomi.

## Revisione (03/10/2026, designer)

D'accordo con correzioni; "niente tab" era troppo: sotto "Convocati" ci sono anche contenuti pubblici. Il "Cosa fare" sopra vale con queste correzioni, che prevalgono:

1. **Via il lucchetto, non le tab.** Precedenti e classifica del girone (`HeadToHeadSection` e classifica, oggi dentro `MatchCallupsTab`) sono pubblici: per chi non è tesserato diventano sezioni normali sotto "Dove e quando". "Statistiche" su una partita non giocata si toglie per tutti.
2. **"Dove e quando" anche per il tesserato**, sopra le tab: l'indirizzo serve soprattutto ai genitori. Restano invariate per lui le tab.
3. **Luogo da una fonte sola** (`matchLocation()` in `@/lib/clubVenue`), condiviso da hero, blocco, JSON-LD ed .ics: in casa `venue` o la sede del club; in trasferta `venue`, altrimenti indirizzo e città dell'avversaria (`OpposingTeam.address` + `city`, da aggiungere alla select); amichevole interna: sede del club; senza dati "Luogo da confermare" e niente link a Maps. Mai "Casa" da solo nella meta.
4. **"Aggiungi al calendario" = un .ics per partita** (`GET /api/matches/[matchId]/event.ics`, `attachment`, rate limit con chiave sua registrata in `routeAccess.test.ts`, orari UTC con `Z`, UID uguale a quello del feed così chi è abbonato non ha doppioni, nessun nome né note). Sotto, link testuale secondario all'abbonamento. Corretto anche `export.ics`: sede da `matchLocation()` invece della copia scritta a mano, luogo anche in trasferta senza `venue`.
5. **Tabellino**: l'orario al centro di una partita futura scende a un peso da orario (non da punteggio).
6. **Partita iniziata senza punteggio**: fino a 3 ore dall'inizio "In corso", poi "Risultato in arrivo", al posto di "– –". "Dove e quando" resta per tutto il giorno della partita.
7. **Ospite = anonimo**: chi vede i convocati lo decide `isMemberRole`. La riga per gli altri: "I convocati li vedono i tesserati" con "Accedi" come link a `/login?callbackUrl=` sulla partita.
8. Il blocco per chi non è tesserato vive nel Server Component: i dati delle tab non finiscono nel payload se non si vedono.

## Criteri di accettazione

- Da anonimo e da ospite, su una partita futura: nessun lucchetto nella prima schermata a 1.440 × 900 e a 390 × 844; indirizzo e data visibili senza scorrere; precedenti e classifica ancora raggiungibili.
- Da tesserato: "Dove e quando" sopra le tab, il resto invariato.
- Partita giocata: nessun cambiamento.
- Trasferta senza `venue` con indirizzo dell'avversaria: indirizzo nel blocco e nell'.ics.
- L'.ics di una partita si importa (DTSTART in UTC, UID come nel feed).
- Testi in `it.json` ed `en.json`; `npm test` e `npm run a11y` verdi.

## Esito

Implementata la revisione del 03/10.

- **Luogo:** `matchLocation()` in `@/lib/clubVenue` (campo della partita; in casa o amichevole interna la sede del club; in trasferta indirizzo + città dell'avversaria; altrimenti `label: null` = "Luogo da confermare", senza Maps). La usano hero (la meta mostra sempre il luogo accanto a Casa/Trasferta), blocco, JSON-LD (`sportsEventJsonLd({ location })`, sede di casa ora presa da `CLUB_VENUE`), feed ed .ics. Solo l'indirizzo (non la sola città) basta per l'avversaria.
- **"Dove e quando"** (`MatchWhereWhen`, Server Component): data e ora, luogo con link a Maps, "Aggiungi al calendario" e il link "Oppure segui tutto il calendario del club" (`MatchSubscribeLink`, apre la stessa finestra di `/calendario`). Per tutti, sopra le tab; resta fino a fine giornata della partita (`showWhereWhen` in `@/lib/matches/matchPhase`).
- **Chi non è tesserato** (`isMemberRole`, ospite = anonimo), partita senza punteggio: niente tab, la riga "I convocati li vedono i tesserati. Accedi" (`loginHref` sulla partita), poi precedenti e classifica come sezioni. `MatchDetailTabs` non viene renderizzato, quindi convocati e statistiche non sono nel payload. Partite giocate invariate.
- **"Statistiche"** sparisce su una partita senza punteggio (e senza statistiche) per tutti.
- **Tabellino:** senza punteggio una riga sola; al centro l'orario a peso semibold (18/24 px), oppure "In corso" (fino a 3 ore) / "Risultato in arrivo" (`matchPhase`).
- **.ics:** `GET /api/matches/[matchId]/event.ics` (rate limit `match-event-ics`, `attachment`, UTC, UID `match-<id>` come nel feed, niente note né nomi), registrata in `routeAccess.test.ts`. `vevent`/`matchVevent` spostati in `@/lib/calendar/ics` e condivisi con `export.ics`, che ora prende il luogo da `matchLocation()` (anche in trasferta senza `venue`) e quello degli allenamenti da `trainingLocation()`.
- **Verifiche:** `tsc --noEmit` pulito; ESLint e Prettier puliti sui file toccati; Vitest su `matchPhase`, `clubVenue`, `ics`/`matchIcs`, `structuredData`, `export.ics`, `event.ics`, `routeAccess` (verdi). Da anonimo con curl: le due partite UX future mostrano blocco, riga convocati con `callbackUrl` e nessuna tab/lucchetto; una partita giocata ha ancora le due tab. L'.ics scaricato ha un solo VEVENT con DTSTART in UTC. `npm run a11y` e la vista da tesserato a browser restano a chi coordina.
- **Correzioni dopo la revisione critica (03/10/2026):** l'anteprima pubblica vale solo senza punteggio **e** senza statistiche (come `showStatsTab`); con "Dove e quando" visibile la riga dell'hero non ripete data e indirizzo, resta Casa/Trasferta + luogo in breve (`matchPlaceShort`: città o nome del campo), perché il blocco è l'unico posto della logistica e il countdown con l'ora al centro bastano a orientarsi; `matchLocation` aggiunge la città se l'ultimo segmento dell'indirizzo non la dice a parole intere ("Via Vicenza 3" → "…, Vicenza"); precedenti e classifica hanno un h2 (h3 sotto il titolo della scheda unica) con lo stesso aspetto; con una sola scheda niente tablist, solo "Convocati" come h2 e il contenuto; "Aggiungi al calendario" alto 44 px su telefono. Verificato con curl da anonimo: data una volta sola, hero "Casa · Montecchio Maggiore", nessun tablist sulle partite future, tablist ancora presente su una partita giocata.

## Rimasto fuori

- Un "ultimo risultato" in home: resta fra i parcheggiati.
