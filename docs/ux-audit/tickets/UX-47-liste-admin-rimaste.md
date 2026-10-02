# UX-47 · Liste admin rimaste: un'azione con l'etichetta più "⋯"

**Ondata:** 5 · **Stima:** M · **Dipende da:** UX-40 (fatto) · **Stato:** da fare

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

## Criteri di accettazione

- Nessuna icona senza etichetta e nessun cestino rosso nelle righe delle liste elencate.
- Target sotto 44 px a 390 px sotto 10 in ognuna delle pagine della tabella.
- Ogni azione di oggi resta raggiungibile; l'eliminazione chiede sempre conferma.
- `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run a11y` verdi.

## Rimasto fuori

- Bottone principale dell'admin sempre nello stesso punto: [UX-51](UX-51-rifiniture.md).
- Azioni in blocco, sidebar, ridisegno delle schede: già "rimasto fuori" di UX-40.
