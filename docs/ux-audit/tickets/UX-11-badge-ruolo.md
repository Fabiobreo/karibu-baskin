# UX-11 · Badge ruolo: numero in evidenza, colori armonizzati

**Ondata:** 1 · **Stima:** M · **Dipende da:** UX-07 · **Stato:** da fare

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
