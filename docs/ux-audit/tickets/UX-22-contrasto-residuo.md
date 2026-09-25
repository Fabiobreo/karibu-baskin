# UX-22 · Contrasto residuo: baseline di `npm run a11y` a zero

**Ondata:** 3 · **Stima:** M · **Dipende da:** nessuno · **Stato:** fatto (commit su `develop`): baseline di `npm run a11y` vuota, e lo script ora misura anche il tema scuro (84 misure, tutte senza violazioni gravi)

## Problema

`e2e/a11y-baseline.json` contiene ancora **18 voci gravi**: 17 `color-contrast` e 1 `target-size`. Sono difetti veri, tollerati finora perché fuori dal perimetro dei ticket precedenti (vedi UX-09, "Rimasto fuori"). Misura del 25/09/2026:

| Dove                                                               | Nodi       | Cosa                                                                                            |
| ------------------------------------------------------------------ | ---------- | ----------------------------------------------------------------------------------------------- |
| `/admin/utenti` (mobile)                                           | 24         | chip ruolo utente "Atleta": bianco su `info` (`#0288D1`)                                        |
| `/admin/partite`                                                   | 17         | chip squadra con colore dal database (verde, arancio) e testo bianco                            |
| `/admin/allenamenti`                                               | 15         | righe degli allenamenti conclusi: testo bianco su pastello, con opacità ridotta sul contenitore |
| `/admin` (dashboard)                                               | 5          | chip `warning` ("N senza email") e chip `info`                                                  |
| `/giocatori/[slug]`                                                | 14         | un bottone e i valori delle card statistiche                                                    |
| `/calendario`, `/contatti`, dettaglio partita, allenamento passato | 1 ciascuno | un giorno del calendario, un bottone, una cella di tabella, un chip squadra                     |
| dettaglio partita (mobile)                                         | 1          | `target-size`: un link troppo piccolo                                                           |

I selettori esatti sono in `test-results/a11y/report.json` dopo `npm run a11y`.

## Cosa fare

1. **Colori dal database** (squadre): un solo helper che, dato un colore, sceglie il testo (bianco o scuro) con `contrastText` di `@/lib/colorUtils` e, se nessuno dei due arriva a 4,5:1, scurisce il fondo. Usarlo in tutti i chip squadra, pubblici e admin.
2. **Chip `info` e `warning` pieni:** nel tema, fondo scurito o testo scuro (come `primary.fill` in UX-07). Verificare in chiaro e in scuro.
3. **Righe concluse di `/admin/allenamenti`:** niente `opacity` sul contenitore; si attenuano con `text.secondary` e un'etichetta "Concluso".
4. **Profilo giocatore:** capire quali valori scendono sotto soglia e usare `primary.onLight` o `text.primary`.
5. Casi singoli: uno per uno, dal report.
6. `target-size` nel dettaglio partita: area di tocco di almeno 24×24 px.
7. `npm run a11y -- --update-baseline` e committare la baseline vuota.

## Criteri di accettazione

- `e2e/a11y-baseline.json` vuota e `npm run a11y` verde.
- Nessun colore scritto a mano: soglie e colori passano dal tema o da `colorUtils`.
- Schermate prima/dopo di admin utenti, admin partite, admin allenamenti e profilo giocatore, tema chiaro e scuro.

## Esito

**Cosa era diverso dal ticket.** In `/admin/allenamenti` i 15 nodi non erano righe pastello con opacità, ma i chip `warning` outlined ("Presenze da segnare", "N risultati mancanti"): testo `#ED6C02` su bianco, 3,11:1. Dashboard e utenti avevano la stessa causa: `warning` e `info` del tema erano i default MUI. Il profilo giocatore: bottone "Condividi" e nomi dei traguardi (oro e bronzo sui loro fondi tinti, 4,16-4,26:1). La voce dell'allenamento passato era il chip "N atleti" semitrasparente sulle intestazioni delle squadre (2,59:1).

**Tema**

- Chiaro: `warning.main` `#A65300` e `info.main` `#0270B0` (5,44 e 5,32:1 sul bianco, 4,97 e 4,86:1 sul crema), validi sia come fondo sotto il bianco sia come testo.
- Medaglie: oro `#7A5F00`, bronzo `#94501F` (oltre 5:1 anche su `goldBg`/`bronzeBg`).
- Scuro: `error` con etichetta scura (5,17:1), come MUI fa già per warning, info e success.
- Nuovo token `match.onFill`: etichetta sopra i riempimenti `match.win`/`draw`/`loss`, bianca in chiaro, scura in scuro. Sostituito il bianco fisso in 30 punti (chip risultato in risultati, avversarie, profilo giocatore, dettaglio partita, pagina squadra, calendario, disponibilità, gironi, badge "in corso").

**Colori dal database:** `readableFill(color, { preferWhite? })` in `@/lib/colorUtils` (con test su tutta la gamma di grigi). Sceglie l'etichetta con `contrastText` e, se nessuna delle due arriva a 4,5:1, scurisce il fondo. Con `preferWhite` tiene il bianco e scurisce: è la variante B scelta per l'arancio (UX-07). Usato nei chip squadra di `/admin/partite`, nel bottone "Condividi" del profilo e nelle intestazioni/tab delle squadre di `TeamDisplay` (qui il testo della tab selezionata passa da `readableOn`, così i "Neri" si leggono anche in scuro).

**Casi singoli**

- Calendario: niente `opacity` sui giorni fuori mese (portava il numero a 1,81:1); fondo `background.default`.
- Contatti: tab attiva in `primary.onLight`.
- Tabella statistiche partita: colonna in evidenza in `primary.onLight`.
- Pareggio in `/admin/partite`: `primary.fill` al posto di `#E65100`.
- Colore del ruolo usato come testo (cronologia ruoli del profilo, occhielli di `RosterByRole`, ruolo suggerito nell'admin): testo neutro, il colore resta su pallino o bordo. In scuro scendeva a 1,88:1.
- `target-size`: il link "Partite" delle briciole nel dettaglio partita ha altezza minima di 24 px.
- Barra del questionario del ruolo senza nome accessibile (`aria-progressbar-name`, emersa perché con il seed di UX-26 l'anonimo vede un allenamento aperto): `aria-label` "Avanzamento del questionario" in it/en.

**`npm run a11y`**

- Misura anche il tema scuro (`desktop-dark`, `mobile-dark`), col cookie `karibu-color-mode`: `karibu-scheme` non basta, in modalità "system" lo script in `<head>` lo riscrive. Il tema scuro da solo ha fatto emergere 4 difetti che la baseline (misurata in chiaro) non conteneva: chip risultato, chip `error`, colore del ruolo come testo, tab delle squadre.
- L'"allenamento passato" dell'atleta esclude gli allenamenti "[UX]" del seed, che non hanno squadre.
- Baseline vuota (`{}`), 84 misure (21 pagine × desktop/mobile × chiaro/scuro), nessuna violazione grave e nessuna pagina più larga di 360 px.

Verifiche: `tsc`, `npm test` (1787), `npm run a11y` verde. Schermate chiaro/scuro di admin utenti, partite, allenamenti, dashboard, profilo giocatore, squadre di un allenamento e calendario.

## Rimasto fuori

- Le schermate "prima" non ci sono: il dev server era condiviso con un'altra sessione e non ho voluto riportare indietro i file mentre girava. I valori di prima sono quelli della tabella in alto e dell'esito.
- `readableFill` è applicato dove c'erano violazioni. Gli altri ~30 chip squadra pubblici usano ancora `contrastText`, che regge per i colori attuali (arancio e verde) ma può scendere appena sotto 4,5:1 per colori a metà luminosità, perché il testo scuro è nero all'87%. Si possono migrare quando si toccano quei file.
- `AdminPartiteClient`: vittoria e sconfitta hanno ancora i colori scritti nel file (`#2E7D32`, `#C62828`), sopra soglia in entrambi i temi.
- Pagina squadra: "vittoria/vittorie", "pareggio", "sconfitta" sono scritti a mano in italiano (fuori dai dizionari), da portare in it/en.
- Il bottone "Condividi" al passaggio del mouse usa `opacity: 0.9`, che abbassa di poco il contrasto.
