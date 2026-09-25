# UX-23 · Pagina del singolo allenamento allineata all'admin

**Ondata:** 3 · **Stima:** S · **Dipende da:** UX-14, UX-15 · **Stato:** fatto (commit su `develop`): nell'hero, per lo staff, "Gestisci" verso `/admin/allenamenti?apri=<id>` al posto della matita; eliminato il dialog di modifica duplicato

## Problema

UX-14 ha portato tutta la gestione degli allenamenti in `/admin/allenamenti` e ha lasciato alla lista pubblica `/allenamenti` il solo "Gestisci". La pagina del **singolo** allenamento (`/allenamento/[session]`) invece ha ancora, per lo staff:

- la matita di modifica nell'hero (`AllenamentoHero`), con **una sua copia** del dialog di modifica al posto di `SessionEditDialog`;
- in quel dialog **manca il campo Luogo** aggiunto da UX-15: da admin si imposta, da qui no (la PATCH senza `location` lo lascia com'è, quindi non si perde, ma non si vede né si cambia);
- i controlli delle squadre, che ripetono quelli di `AdminSessionTeams`.

Due strade per la stessa cosa, con comportamenti diversi.

## Cosa fare

1. Nell'hero, per lo staff, un solo bottone "Gestisci" verso `/admin/allenamenti?apri=<id>` (come nella lista pubblica), oppure riusare `SessionEditDialog` al posto della copia. Consigliato il primo: una sola strada.
2. Se la matita resta: usare `SessionEditDialog` (che ha già il Luogo) e cancellare il dialog duplicato di `AllenamentoHero`.
3. Controlli delle squadre nella pagina pubblica: per lo staff solo la visualizzazione, con il link all'admin per modificare. Da verificare che nessun flusso da telefono dipenda da questi controlli (per esempio creare le squadre in palestra): in quel caso tenerli, ma con lo stesso componente dell'admin.

## Criteri di accettazione

- Nel codice un solo dialog di modifica dell'allenamento.
- Dalla pagina dell'allenamento lo staff arriva alla gestione completa (Luogo compreso) in un tocco.
- Nessuna funzione persa: ogni azione oggi possibile dalla pagina resta raggiungibile.

## Esito

- **Hero (`AllenamentoHero`):** la matita e il suo dialog di modifica (circa 150 righe, senza il campo Luogo) sono spariti. Al loro posto, per lo staff, un bottone "Gestisci" (chiave già esistente `trainings.manageRoster`) verso `/admin/allenamenti?apri=<id>`, che apre l'allenamento espanso: da lì "Modifica" usa `SessionEditDialog`, con il Luogo. Nel codice resta un solo dialog di modifica.
- `SessionPageClient`: tolti `onSessionSaved` e il cambio di URL dopo il salvataggio, non più necessari.
- **Squadre (punto 3):** restano sulla pagina pubblica, perché la pagina e l'admin usano già lo stesso componente (`TeamDisplay` con `TeamsHeader`, lo stesso di `AdminSessionTeams`) e servono in palestra da telefono. Lo stesso vale per "Apri/Chiudi iscrizioni" e "Gestisci iscritti": nessuna funzione persa.
- Verifica con Playwright (admin, desktop e 360 px): il bottone porta a `/admin/allenamenti?apri=ux-training-open` con l'allenamento aperto; pagina larga 360 px su mobile. `tsc` verde.

## Rimasto fuori

- Nulla di funzionale. Gli avvisi ESLint sui `fontSize` letterali dei due file restano per UX-27.
