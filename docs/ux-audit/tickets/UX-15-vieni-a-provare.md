# UX-15 · Percorso "Vieni a provare" + luogo dell'allenamento

**Ondata:** 2 · **Stima:** M · **Dipende da:** UX-06 (modulo contatti aperto, CTA in `/squadre`) · **Stato:** fatto (commit su `develop`): sezione "Vieni a provare" in Contatti con modulo, CTA dei visitatori puntate li', luogo dell'allenamento con migration, riepilogo dopo l'iscrizione

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

## Esito

- **Decisioni del committente (2026-09-25):**
  - orari: i prossimi allenamenti veri dal calendario, non un orario scritto a mano;
  - prima volta: "senza impegno", senza parlare di gratuita';
  - cosa portare: scarpe da ginnastica pulite (da palestra), abbigliamento comodo, una borraccia;
  - luogo predefinito: Polisportivo Gino Cosaro.
- **Sezione `TryItSection`** in `/contatti#vieni-a-provare` (ancora, nessun URL nuovo), in cima alla sezione Contatti:
  - quando: i prossimi 3 allenamenti con il luogo, piu' il link al calendario;
  - dove: sede e link a Google Maps, senza mappa incorporata quindi senza cookie; la mappa col consenso resta piu' sotto;
  - cosa portare, il modulo e il link alle FAQ;
  - il modulo si e' spostato qui, niente doppioni.
- **CTA per chi non e' tesserato:** hero della home anonima ("Vieni a provare" al posto di "Prossimi allenamenti", prop `visitor`), `JoinUsCta`, home senza allenamenti, `/squadre`, tutte verso `TRY_IT_HREF`. Tesserati e GUEST mantengono le loro CTA.
- **Luogo:** `TrainingSession.location String?` con migration `20260925000000_training_session_location` (SQL generata con `prisma migrate diff` e verificata: solo la colonna). Null = sede abituale (`CLUB_VENUE`, `trainingLocation()` in `@/lib/clubVenue`, con test), quindi gli allenamenti esistenti la mostrano senza aggiornare i dati. Campo "Luogo" nel form di creazione (precompilato) e in `SessionEditDialog`; API POST/PATCH e schemi Zod aggiornati. Nell'hero dell'allenamento, accanto a data e ora, con link alla mappa.
- **Riepilogo dopo l'iscrizione** (`RegistrationSummary`): "Sei iscritto" / "Hai iscritto {nomi}" / "Sei iscritto insieme a {nomi}", con data, orario e luogo, in cima alla pagina finche' l'allenamento non e' finito. I dati vengono da `GET /api/registrations?mine=1` (2 test), che restituisce solo le iscrizioni proprie e dei figli a chiunque abbia fatto l'accesso.
  - Effetto collaterale utile: un account GUEST non vedeva la rosa, quindi il form non sapeva che era gia' iscritto; ora lo sa.
- **Verifica** con Playwright su telefono:
  - dalla home anonima "Vieni a provare" porta a `/contatti#vieni-a-provare` in un tocco, con quando, dove e cosa portare nella prima schermata e il modulo subito sotto;
  - con un atleta e un account GUEST iscritti per prova (iscrizioni poi cancellate) il riepilogo resta dopo il ricaricamento;
  - luogo nell'hero;
  - "Luogo" precompilato nel form admin.
- `npm test` verde (1766), `npm run a11y` senza nuove violazioni.

**Rimasto fuori**

- Chi si iscrive **senza account** (iscrizione anonima) non vede il riepilogo dopo il ricaricamento: non c'e' un modo di riconoscerlo senza salvare qualcosa nel browser.
- Il testo "senza impegno" e la lista "cosa portare" sono nei dizionari (`pages.contatti.try*`): se il club vuole cambiarli, si cambiano li'.
- Il dialog di modifica nell'hero della pagina allenamento (`AllenamentoHero`) non ha ancora il campo Luogo: da admin si', da li' no (la PATCH senza `location` non lo tocca).
