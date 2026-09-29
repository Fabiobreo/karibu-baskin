# UX-42 · Area utente: notifiche, profilo, selettore "per chi"

**Ondata:** 4 · **Stima:** S · **Dipende da:** UX-32 · **Stato:** da fare

## Problema

**`/notifiche`** (`src/components/notifications/NotificheClient.tsx`):

- il titolo di ogni riga è il tipo generico ("Nuovo allenamento", "Nuovo sondaggio") in arancione, e il contenuto utile ("Allenamento a luglio, mercoledì 15 luglio, 18:00-20:00") sta sotto in grigio: gerarchia rovesciata;
- gruppo "PRIMA (20)": non si capisce "prima di cosa";
- "Segna tutte come lette" è grigio chiaro e sembra disattivato;
- righe da circa 90 px con la data su una riga a sé.

**`/profilo`:**

- in "Dati atleta" l'etichetta "Ruolo Baskin" sta a sinistra e il valore (badge "5") a 800 px di distanza, a destra;
- sotto un avatar vuoto compare "Foto da Google";
- il ruolo utente "Atleta" è un chip arancione pieno, ma non è toccabile (contro la regola di UX-07);
- in "Presenze agli allenamenti" la stagione corrente è un chip arancione pieno e le altre un chip contornato, senza spiegazione.

**"Per chi ti iscrivi?"** nel form d'iscrizione del genitore: compaiono due "Marco Cenci", uno per l'account e uno per la scheda figlio della stessa persona, distinti solo dall'icona.

## Cosa fare

1. **Notifiche:**
   - contenuto come titolo (nero, 600), tipo come occhiello con icona (neutro), tempo relativo sulla stessa riga del tipo;
   - gruppi "Oggi", "Questa settimana", "Prima";
   - "Segna tutte come lette" come bottone di testo con contrasto pieno;
   - righe da circa 64 px.
2. **Profilo:**
   - coppie etichetta-valore vicine (griglia a due colonne da 160 px, oppure valore sotto l'etichetta);
   - "Foto da Google" solo se la foto c'è;
   - chip del ruolo utente neutro (UX-29);
   - presenze come elenco "2026-27: 1 allenamento", senza chip.
3. **Per chi ti iscrivi?:** se account e scheda figlio sono la stessa persona (`Child.userId`), mostrare **una** voce; altrimenti aggiungere una seconda riga che distingue ("il tuo account" / "scheda gestita da …").

## Criteri di accettazione

- In `/notifiche` il contenuto di ogni notifica è la prima cosa letta nella riga.
- Nessun chip arancione non toccabile in `/profilo`.
- Nessun nome ripetuto e indistinguibile nel selettore "per chi".
- Testi in `it.json` ed `en.json`; `npm run a11y` verde.
