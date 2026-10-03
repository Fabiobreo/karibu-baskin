# UX-47 · Liste admin rimaste: un'azione con l'etichetta più "⋯"

**Ondata:** 5 · **Stima:** M · **Dipende da:** UX-40 (fatto) · **Stato:** fatto (03/10/2026)

Nato dal [riaudit del 02/10/2026](../RIAUDIT-2026-10-02.md), problema 4.

## Problema

UX-40 ha fissato la regola per le righe delle liste admin: una sola azione con l'etichetta, scelta dallo stato, e il resto in un menu "⋯" da 44 px; mai file di icone senza nome né cestini rossi in riga. È stata applicata a `/admin/partite` e `/admin/utenti`. Le altre liste sono rimaste com'erano:

| Pagina                        | Componente               | Oggi in riga                          | Target sotto 44 px a 390 px |
| ----------------------------- | ------------------------ | ------------------------------------- | --------------------------- |
| `/admin/eventi`               | `AdminEventiClient`      | matita, cestino rosso, "Risposte · N" | 27 su 31                    |
| `/admin/avversarie`           | `AdminAvversarieClient`  | matita, cestino rosso                 | 33 su 39                    |
| `/admin/news`                 | `AdminNewsClient`        | icone                                 | 18 su 22                    |
| `/admin/gironi`               | `AdminGironiClient`      | icone                                 | 13 su 19                    |
| `/admin/squadre`              | `AdminSquadreClient`     | icone                                 | 11 su 15                    |
| Convocazioni                  | `ConvocazioniClient`     | chip "R1 … R5", "Tutti / Nessuno"     | 13 su 17                    |
| Riga aperta di un allenamento | `TeamDisplay` (da staff) | condividi, matita, cestino rosso      | —                           |

Chi passa da Partite a Eventi trova due modi diversi di fare la stessa cosa, e su telefono il cestino rosso sta a 8 px dalla matita.

## Cosa fare

1. Stesso disegno di `MatchRowActions` e `PersonRowMenu`: un'azione con l'etichetta e un menu "⋯" da 44 px con il resto; "Elimina…" in fondo al menu, separata, con la conferma che c'è già.
2. Azione in riga per lista:
   - eventi: "Risposte · N" (è quella che si usa); nel menu Modifica, Pagina pubblica, Elimina;
   - avversarie: "Modifica"; nel menu Scheda, Elimina;
   - news: "Modifica"; nel menu Pagina pubblica, Pubblica o Nascondi, Elimina;
   - gironi: "Apri"; nel menu Modifica, Elimina;
   - squadre: "Rosa"; nel menu Modifica, Pagina pubblica, Elimina.
3. Squadre di un allenamento (riga aperta in `/admin/allenamenti` e pagina allenamento da staff): "Modifica squadre" con l'etichetta, condividi ed elimina nel menu.
4. Convocazioni su telefono: filtri di ruolo e "Tutti / Nessuno" con `TOUCH_TARGET_ON_PHONE`.
5. Se serve, estrarre un componente comune per riga e menu invece di cinque copie.

## Revisione (03/10/2026, designer)

D'accordo con correzioni; in tre punti il ticket descriveva male lo stato attuale. Prevale questo:

1. **Componente comune** `components/admin/RowActions`: `subject` (per i nomi accessibili), `primary?` (azione con l'etichetta, `href` o `onClick`), `items[]` (con `href`, `onClick`, `external?`) e `onDelete?` separato, sempre ultima voce dopo il divisore, con la conferma di `useConfirmDialog` (anche per news ed eventi, che oggi hanno un Dialog proprio). Nome del "⋯": "Altre azioni: X" se c'è un'azione in riga, "Azioni: X" se no. `MatchRowActions` e `PersonRowMenu` diventano involucri sottili, senza cambiare comportamento. Dopo un'eliminazione il focus va su un punto fisso (intestazione della lista o bottone "Nuovo").
2. **Eventi**: "Risposte · N" è l'azione in riga e assorbe la colonna "Risposte" (niente bottone doppio). Menu: Modifica, Pagina pubblica, Elimina evento…; la conferma nomina l'evento e dice quante risposte si perdono.
3. **Avversarie**: "Modifica" in riga; menu: "Pagina pubblica" (solo con lo slug; non "Scheda", che nelle partite è la scheda tecnica), Elimina. Il nome diventa testo semplice. Eliminare un'avversaria con partite oggi dà 500 (vincolo senza `onDelete`): la DELETE gestisce l'errore (P2003 → 409 con un messaggio che lo spiega).
4. **News**: "Modifica" in riga; menu: "Pubblica (avvisa tutti)" o "Rimetti in bozza" secondo lo stato, "Pagina pubblica" solo se pubblicata, Elimina.
5. **Gironi**: niente bottone in riga ("Apri" ripeterebbe il link del nome, e la modifica sta nella pagina del girone): nome come link e "⋯" con "Elimina girone…".
6. **Squadre**: "Rosa" in riga; menu: Modifica, Pagina pubblica, Elimina, ma Modifica ed Elimina **solo per l'admin** (l'API le rifiuta all'allenatore). Via l'`onClick` della card verso la pagina pubblica (i clic nel menu risalirebbero dal portal). Il "⋯" sul fondo con la tinta usa `ON_FILL_ICON_SX`, 44 px.
7. **Squadre di un allenamento**: il componente è `TeamsHeader` (condiviso da pagina pubblica, `AllenamentoEndedView` e `AdminSessionTeams`). "Condividi" con l'etichetta, per tutti (è l'azione più frequente); per lo staff un "⋯" con "Modifica squadre" e "Rimuovi squadre…". `ShareTeamsButton` va diviso fra azione e sorgente dell'immagine nascosta. Testi pubblici in `it.json` ed `en.json`.
8. **Convocazioni**: a 44 px su telefono i filtri di ruolo, "Tutti" del filtro e "Tutti / Nessuno" della selezione (sono due cose diverse), "Salva" e le intestazioni ordinabili; i filtri espongono `aria-pressed`.
9. **Telefono**: righe con il testo sopra e le azioni a destra, non card con bottoni a tutta larghezza. In gironi e avversarie le colonne secondarie si nascondono a 390 px, così il "⋯" non esce dallo schermo.

## Criteri di accettazione

- Nessuna icona senza etichetta e nessun cestino rosso nelle righe delle liste elencate.
- Target sotto 44 px a 390 px sotto 10 in ognuna delle pagine della tabella.
- Ogni azione di oggi resta raggiungibile; l'eliminazione chiede sempre conferma.
- `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run a11y` verdi.

## Esito

- `components/admin/RowActions`: bottone con l'etichetta, "⋯" da 44 px, "Elimina…" ultima dopo il divisore con la conferma di `useConfirmDialog` (`deleteConfirm={false}` solo dove la chiede già il chiamante), focus su un punto fisso dopo l'eliminazione. `MatchRowActions` e `PersonRowMenu` ne sono involucri. Scelte per stato in `@/lib/adminRowActions` (con test).
- Eventi, avversarie, news, gironi e squadre come da revisione; le squadre nascondono Modifica, Elimina e "Nuova squadra" all'allenatore. `TeamsHeader`: "Condividi" con l'etichetta per tutti, "⋯" dello staff con "Modifica squadre" e "Rimuovi squadre…" (conferma tradotta, ora anche sulla pagina dell'allenamento, che prima non la chiedeva). La DELETE delle avversarie risponde 409 con un messaggio quando la squadra ha partite.
- Target sotto 44 px a 390 px (admin, stessa funzione di `misure/rimisura.mjs`), prima → dopo: eventi 27 su 31 → 6 su 24; avversarie 33 su 39 → 7 su 30; news 18 su 22 → 6 su 16; gironi 13 su 19 → 8 su 17; squadre 11 su 15 → 2 su 14; convocazioni 13 su 17 → 4 su 17. Restano link "Vai al contenuto", breadcrumb, campi `small` e paginazione di MUI.
- `npm run a11y` non lanciato in questa sessione (dev server condiviso): da rifare con la baseline.
- Correzioni dopo la revisione critica: la DELETE delle avversarie conta prima partite del club e di girone e risponde 409 (sul DB la FK delle partite del club è `ON DELETE SET NULL`: prima l'eliminazione riusciva e lasciava partite senza avversario); la rosa per l'allenatore è in sola lettura ("Vedi rosa", niente pool né controlli, l'API members è dell'admin) e "Nuova stagione" è solo dell'admin; focus dopo l'eliminazione anche in Partite (h1, `PageHeader titleRef`), Utenti (scheda attiva) e dopo "Rimuovi squadre…" (titolo "Squadre"); "Pubblica (avvisa tutti)" chiede conferma, "Rimetti in bozza" no; "Modifica squadre" diventa "Fine modifica" a modifica attiva; tolti gli export inutili di `ShareTeamsButton` e il test che ricopiava `teamMenuEntries`.

## Rimasto fuori

- Bottone principale dell'admin sempre nello stesso punto: [UX-51](UX-51-rifiniture.md).
- Azioni in blocco, sidebar, ridisegno delle schede: già "rimasto fuori" di UX-40.
