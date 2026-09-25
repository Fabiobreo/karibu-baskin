# UX-11 · Badge ruolo: numero in evidenza, colori armonizzati

**Ondata:** 1 · **Stima:** M · **Dipende da:** UX-07 · **Stato:** fatto (commit su `develop`): componente `RoleBadge` col numero in evidenza, palette a tinte tenui (scelta del committente), colori dei ruoli solo tramite helper

## Contesto

Decisione del committente: i colori dei ruoli sono **puramente estetici**. In palestra i ruoli non si distinguono per colore, quindi si possono ridisegnare liberamente.

## Problema

`ROLE_COLORS` in `src/lib/constants.ts:47-51` assegna 1 blu `#1565C0`, 2 verde `#2E7D32`, 3 arancio `#E65100`, 4 viola `#6A1B9A`, 5 rosso `#C62828`:

- il verde del ruolo 2 è lo stesso di "Vittoria", il rosso del ruolo 5 quello di "Sconfitta" e degli errori: "Ruolo 5" in rosso nel profilo sembra un avviso;
- il ruolo 3 è l'arancio del brand e delle azioni;
- blu e viola introducono colori estranei all'identità arancio e nero;
- i chip "Ruolo 5" sono piccoli (circa 10 px).

Usato in **42 file**; in **32 punti** il colore del ruolo è abbinato a `color: "#fff"` fisso (vincolo documentato nel commento sopra la costante).

## Cosa fare

1. Componente `RoleBadge` unico: il **numero** è l'elemento principale ("5" in un cerchio o riquadro), l'etichetta "Ruolo" è secondaria o solo per i lettori di schermo; dimensione minima 12 px per il testo, 24 px per la forma.
2. Nuova palette dei ruoli: tinte che non si confondono con verde (vittoria), rosso (sconfitta/errore) e arancio (azione). Opzioni: scala di grafite/neutri, oppure una famiglia di tinte tenui armonizzate col nero. Tutte devono reggere il testo del badge con contrasto AA.
3. Sostituire i 32 `color: "#fff"` fissi con il colore di testo previsto dal badge (o `contrastText` di `colorUtils`).
4. Pagine da controllare: `/il-baskin` (card dei ruoli con fascia colorata in testa), marcatori, rose squadra, iscritti all'allenamento, admin utenti, convocazioni, generatore squadre.

## Criteri di accettazione

- Nessun ruolo con verde, rosso o arancio.
- Il numero del ruolo si legge in tutti i contesti anche in bianco e nero.
- `ROLE_COLORS` usato solo attraverso `RoleBadge` (o un helper), senza colori di testo fissi.

## Esito

- **Palette** (decisione del committente, settembre 2026: tinte tenui armonizzate col nero):

  | Ruolo | Tinta       | Colore    | Col bianco |
  | ----- | ----------- | --------- | ---------- |
  | 1     | blu ardesia | `#3D5A80` | 7,06:1     |
  | 2     | petrolio    | `#2F6B73` | 6,05:1     |
  | 3     | indaco      | `#555A96` | 6,38:1     |
  | 4     | prugna      | `#7A4E7A` | 6,57:1     |
  | 5     | grafite     | `#4A4A4A` | 8,86:1     |

  Scartata la scala di grafite. Aggiornata anche la copia locale in `giocatori/[slug]/opengraph-image.tsx`.

- **Helper:** `ROLE_COLORS` non e' piu' esportato da `constants.ts`. Si passa da `roleColor(n)`, da `roleColorSx(n)` (riempimento + testo) e da `ROLE_TEXT_COLOR`: i 32 bianchi fissi accanto al colore del ruolo ora sono `ROLE_TEXT_COLOR`.
- **`RoleBadge`** (`src/components/common/RoleBadge.tsx`, usabile anche nei Server Component):
  - il numero, con l'eventuale lettera della variante, in un riquadro di 24 px (32 px con `size="large"`);
  - "Ruolo N" completo solo per i lettori di schermo, oppure visibile con `showLabel`;
  - bordo `divider` per staccarlo dal fondo in tema scuro;
  - dimensioni dalla scala tipografica.
- **Sostituzioni:** 25 chip "Ruolo N" di sola visualizzazione diventati `RoleBadge` (codemod). I filtri R1-R5 restano chip, colorati tramite l'helper.
- **Verifica:** schermate prima/dopo, anche in bianco e nero, di il Baskin, marcatori, rosa squadra, iscritti all'allenamento, admin utenti, convocazioni e squadre dell'allenamento; il numero si legge ovunque. `npm run a11y` senza nuove violazioni.

**Rimasto fuori**

- Il chip del ruolo **suggerito** in attesa di conferma (bordato, "Ruolo 5 ?") e le fasce colorate delle card in `/il-baskin` usano il nuovo colore ma non `RoleBadge`: hanno un disegno diverso di proposito.
- Il tabellino e le OG della partita non mostrano ruoli e non sono stati toccati.
