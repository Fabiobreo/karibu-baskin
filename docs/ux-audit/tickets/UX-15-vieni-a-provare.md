# UX-15 · Percorso "Vieni a provare" + luogo dell'allenamento

**Ondata:** 2 · **Stima:** M · **Dipende da:** UX-06 (modulo contatti aperto, CTA in `/squadre`) · **Stato:** da fare

## Problema

Portare nuove persone ad allenarsi è l'obiettivo principale della parte pubblica, ma il percorso oggi è di 5-6 passi e le informazioni sono sparse:

- la CTA principale dell'hero porta alla lista allenamenti; "Vieni a provare" (`HomeSessionsSection.tsx:167`) e "Scrivici" (`JoinUsCta.tsx:37`) portano a `/contatti`, dove il modulo era chiuso (UX-06);
- orari e sede sono in punti diversi di `/contatti`; "Dove e quando vi allenate?" è nelle FAQ, sotto il menu Contatti;
- non si dice cosa portare né che la prima volta si può venire a provare senza impegno;
- **la pagina di un allenamento non dice dove si svolge:** `TrainingSession` non ha un campo luogo (ce l'hanno `Match.venue` ed `Event.location`);
- dopo l'iscrizione la conferma è solo un avviso che sparisce: non resta un riepilogo di quando e dove.

## Cosa fare

1. **Sezione o pagina "Vieni a provare"** (anche un'ancora in `/contatti`, per non creare un nuovo URL): giorno e ora abituali, sede con indirizzo e mappa (rispettando il consenso ai cookie già in uso), cosa portare, "la prima volta è gratis" (testo da confermare con il club), modulo già aperto, link alle FAQ.
2. Tutte le CTA per chi non è tesserato puntano lì.
3. **Luogo dell'allenamento:** nuovo campo facoltativo su `TrainingSession` (per esempio `location String?`) con migration (`npm run db:migrate`), valore predefinito la palestra abituale, campo nel form staff, mostrato nell'hero dell'allenamento.
4. **Riepilogo dopo l'iscrizione:** blocco che resta visibile nella pagina dell'allenamento ("Sei iscritto: martedì 8 giugno, 18:00-20:00, Palazzetto…").
5. Testi in `it.json` ed `en.json`.

## Criteri di accettazione

- Da home, chi non è tesserato arriva al modulo in 1 tocco e vede orari, sede e cosa portare nella stessa schermata.
- Ogni allenamento mostra il luogo.
- Dopo l'iscrizione il riepilogo resta visibile ricaricando la pagina.
- Migration committata insieme allo schema.
