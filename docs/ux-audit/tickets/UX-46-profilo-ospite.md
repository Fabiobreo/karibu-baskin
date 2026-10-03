# UX-46 · Profilo dell'ospite senza card contraddittorie

**Ondata:** 5 · **Stima:** S · **Dipende da:** nessuno · **Stato:** fatto (03/10/2026)

Nato dal [riaudit del 02/10/2026](../RIAUDIT-2026-10-02.md), problema 2. Rivisto il 03/10/2026 prima di lavorarlo (vedi "Revisione").

## Problema

In `/profilo`, per un account in attesa (GUEST), con un allenamento in programma:

- la card "I tuoi primi passi" (`GuestOnboardingCard`) dice "Vieni al primo allenamento · Il prossimo è lun 5 ott, 18:00" con il bottone "Iscriviti";
- poco sotto, la card "Prossimo allenamento" dice "Nessun allenamento in programma. Appena lo staff ne pubblica uno lo trovi qui e sulla home".

Le due card parlano dello stesso allenamento e dicono cose opposte.

**Causa** (`src/app/profilo/page.tsx`): la query dell'allenamento funziona. La card nasce solo se c'è almeno una persona da iscrivere (`subjects.length > 0`); l'ospite non conta come atleta e non ha figli, quindi `nextTraining` resta `null` e la pagina lo legge come "nessun allenamento". Allenatori e admin contano sempre come atleti: per loro la card c'è già.

Inoltre "Le mie disponibilità" (bottone nel profilo e voce nel menu dell'avatar dell'header) porta chi non ha partite a una pagina sempre vuota, che dice "Nessuna partita trovata per le tue squadre" anche a chi una squadra non ce l'ha. E la card dell'identità dell'ospite ripete "Lo staff deve ancora confermare il tuo account", che è già un passo della card dei primi passi.

## Cosa fare

1. **Card "Prossimo allenamento"**: per l'ospite non c'è, e la sua query non parte (i primi passi hanno i loro dati). "Nessun allenamento in programma" si mostra solo quando l'allenamento non c'è davvero, non quando non c'è nessuno da iscrivere.
2. **"Le mie disponibilità"** (bottone del profilo e voce del menu dell'header), con una regola sola: si vede a chi può avere partite a cui rispondere, cioè atleti, genitori, staff che gioca (lo stesso pubblico della card "prossima cosa da fare", `showsNextAction`) e chiunque abbia figli collegati. Mai all'ospite. Per l'header la regola arriva nella sessione (`session.user.showsAvailabilities`), calcolata nella query che la sessione fa già. Per l'ospite non si conta nemmeno le disponibilità pendenti.
3. **Pagina `/profilo/disponibilita`** per chi ci arriva senza squadra (segnalibro, link condiviso): uno stato vuoto che spiega, "Non sei ancora in una squadra · Quando lo staff ti inserisce in una squadra, qui rispondi alle convocazioni". Niente redirect. Chi ha una squadra senza partite tiene il testo di oggi.
4. Togliere la riga "Lo staff deve ancora confermare il tuo account" dalla card dell'identità: la dice già la card dei primi passi.

## Criteri di accettazione

- Da ospite, con un allenamento futuro: in `/profilo` l'allenamento compare una volta sola, nei primi passi; nessun "Nessun allenamento in programma", nessuna riga "Lo staff deve ancora confermare" nella card dell'identità.
- Da allenatore che non gioca, con un allenamento futuro: la card "Prossimo allenamento" lo mostra.
- Da ospite e da allenatore che non gioca (senza figli): nessun "Le mie disponibilità", né nel profilo né nel menu dell'header.
- Da atleta e da genitore: "Le mie disponibilità" c'è in entrambi i posti, come oggi.
- `/profilo/disponibilita` da ospite: lo stato vuoto "Non sei ancora in una squadra".
- Testi nuovi in `it.json` e `en.json`. `npm test` e `npm run a11y` verdi.

## Esito (03/10/2026)

Provato nel browser sul dev server con il login di prova, con l'allenamento "[UX] Ciclo di vita" del 5 ottobre in programma:

| Chi                      | `/profilo`                                                                                   | "Le mie disponibilità" (profilo / menu header) |
| ------------------------ | -------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Ospite                   | allenamento una volta, nei primi passi; niente "Nessun allenamento", niente riga sullo staff | no / no                                        |
| Allenatore che non gioca | card "Prossimo allenamento" con l'allenamento                                                | no / no                                        |
| Atleta                   | invariato                                                                                    | sì (con il contatore) / sì                     |

`/profilo/disponibilita` da ospite: "Non sei ancora in una squadra". Regola in `showsAvailabilities` (`@/lib/matches/availabilityAudience`, testata), nella sessione come `session.user.showsAvailabilities`. `npm test` e `npm run a11y` verdi.

**Correzioni dopo la revisione critica (03/10/2026):** l'ospite con figli collegati vede "Le mie disponibilità" (il cron `match-availability-reminder` lo manda lì); la pagina vuota dice "dici se ci sei alle partite" (non "rispondi alle convocazioni") e, a chi ha figli, "Nessuno dei tuoi è ancora in una squadra" (`hasChildren` da `loadMyAvailabilityPage`).

## Revisione (03/10/2026)

1. La causa era già individuabile: non la query, ma la card che nasce solo con qualcuno da iscrivere. Il criterio dell'allenatore era già soddisfatto.
2. "Le mie disponibilità" è anche nel menu dell'header: va tolta anche lì, altrimenti il vicolo cieco resta a un tocco.
3. "Tesserato" (`isMemberRole`) era la regola sbagliata: l'allenatore che non gioca è tesserato e ha la pagina sempre vuota. La regola giusta è chi può avere partite a cui rispondere.
4. Chi arriva lo stesso alla pagina deve leggere perché è vuota.
5. La riga "lo staff deve confermare" era un doppione dei primi passi.

Resta com'è, per scelta già scritta in CLAUDE.md: per l'ospite i primi passi stanno sopra la card dell'identità, per gli altri la card dell'azione sta sotto.
