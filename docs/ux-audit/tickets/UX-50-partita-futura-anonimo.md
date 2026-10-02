# UX-50 · Partita futura per chi non è tesserato

**Ondata:** 5 · **Stima:** S · **Dipende da:** nessuno · **Stato:** da fare

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

## Criteri di accettazione

- Da anonimo, su una partita futura: nessun lucchetto nella prima schermata a 1.440 × 900 e a 390 × 844; indirizzo e data visibili senza scorrere.
- Da tesserato: nessun cambiamento.
- Partita giocata: nessun cambiamento.
- Testi in `it.json` ed `en.json`; `npm run a11y` verde.

## Rimasto fuori

- Un "ultimo risultato" in home: resta fra i parcheggiati.
