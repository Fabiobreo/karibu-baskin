# UX-53 · Squadre dell'allenamento a specchio, anche su telefono

**Ondata:** 6 · **Stima:** S · **Dipende da:** nessuno · **Stato:** in corso

Chiesto dal committente il 26/10/2026 (non nasce da un riaudit). Revisione a tre voci: UX senior, designer, product owner.

## Problema

Su telefono (sotto `md`) le squadre generate per un allenamento si vedono in una tab per squadra (`MobileTeamTabs` in `TeamDisplay.tsx`, usato anche da `TeamsModal`). Era una scelta voluta, si è rivelata sbagliata:

- **Il confronto sparisce.** La generazione bilancia le squadre per ruolo Baskin, ma con le tab non si vede mai che a ogni 5 di qua corrisponde un 5 di là: bisogna toccare, ricordarsi i nomi e confrontare a memoria.
- **"Con chi gioco, contro chi gioco"** è la domanda di atleti e genitori. Le tab ne mostrano metà alla volta.
- **Con 3 squadre le tab comparivano anche su desktop** (`isDesktop && !teams.teamC?.length`).

## Decisioni

1. **Tabellone a specchio per 2 squadre, a ogni larghezza.** Tre colonne: prima squadra a sinistra, ruolo al centro, seconda squadra a destra allineata a destra. Una riga per ruolo Baskin (dall'1 al 5, l'ordine di `ROLES`), con il `RoleBadge` al centro; i nomi delle due squadre per quel ruolo stanno nella stessa riga, uno sotto l'altro. Il bilanciamento si legge da solo, senza etichette né conteggi per ruolo. È la stessa struttura su telefono e desktop: un modello mentale solo (sostituisce `AlignedTeamGrid` per le 2 squadre).
2. **Intestazione:** due fasce piene nel colore della casacca (`bibSurfaceSx`, eccezione chiusa di UX-29: sempre col nome) con il nome e sotto il numero di atleti ("Arancioni" / "7 atleti"); al centro "vs" su fondo neutro.
3. **Ordine fisso delle squadre** (Arancioni a sinistra, Neri a destra) per tutti, anche se chi guarda è nei Neri: l'allenatore legge le squadre ad alta voce e l'immagine condivisa è la stessa, quindi tutti devono vedere lo stesso tabellone. La squadra di chi guarda la dice già il banner "La tua squadra" sopra.
4. **"Tu" e "Famiglia" nel tabellone**, come nella distinta dei convocati (`CallupRow`): il nome ha il fondo `action.hover` e un'etichetta contornata neutra. "Tu" per chi guarda o la sua scheda figlio collegata, "Famiglia" per i figli. Si ricava dalle iscrizioni di famiglia (`mine`) già presenti nella pagina.
5. **Nomi interi**, nome e cognome, che vanno a capo: mai troncati, mai abbreviati (per i genitori il cognome conta). A 360 px restano circa 140 px per colonna, 18-20 caratteri in `body2`. Le abbreviazioni restano solo nell'immagine da condividere, che non cambia.
6. **Un ruolo che manca in una squadra** lascia la sua metà vuota: lo squilibrio deve vedersi.
7. **3 squadre:** sotto `md` tre colonne non ci stanno, quindi una card per squadra impilata (fascia della casacca, poi le righe per ruolo con il badge e i nomi a capo), tutte visibili, senza tab. Da `md` la griglia allineata a tre colonne di oggi (`AlignedTeamGrid`).
8. **Allenatori:** una riga sotto il tabellone, come oggi.
9. **Lettori di schermo:** l'ordine nel DOM è una squadra intera e poi l'altra (titolo h3 della squadra, poi per ogni ruolo "Ruolo N" nascosto e i nomi), mentre la posizione nella griglia è esplicita (`gridRow`/`gridColumn`). La colonna centrale è `aria-hidden`. Così il tabellone non si legge "Luca, 5, Marco".
10. **Dove cambia:** pagina dell'allenamento (`TeamDisplay`) e `TeamsModal`. Non cambiano l'editor dello staff (`TeamEditor`), `ShareTeamsButton` e l'immagine condivisa.

## Criteri di accettazione

- A 360 × 800, con 2 squadre da 6-8 atleti: entrambe le squadre visibili insieme, nessuno scorrimento orizzontale, nessuna tab; ogni ruolo sulla stessa riga nelle due squadre.
- Un nome lungo ("Maria Vittoria Dal Molin Zanella") va a capo dentro la sua colonna senza allargare la pagina.
- Atleta iscritto: il suo nome ha "Tu"; genitore con un figlio in squadra: "Famiglia" sul figlio.
- 3 squadre: card impilate sotto `md`, griglia a tre colonne da `md`.
- Tema chiaro e scuro: la fascia dei Neri resta visibile in scuro (contorno di `bibSurfaceSx`).
- Testi nuovi in `it.json` ed `en.json`; `tsc --noEmit`, ESLint, `npm test` verdi.

## Esito

Implementato il 26/10/2026, non ancora committato.

- **`TeamBoard.tsx`** (nuovo, `@/components/training/TeamBoard`): `TeamsView` sceglie il layout (2 squadre → `MirrorTeamBoard` a ogni larghezza; 3 → `StackedTeamCards` sotto `md`, `AlignedTeamGrid` da `md`). `AthleteName` disegna nome, link al profilo e "Tu"/"Famiglia"; `TeamHeading` è l'h3 sulla fascia della casacca. `AlignedTeamGrid` e il badge a pillola sono stati spostati qui da `TeamDisplay.tsx`; `MobileTeamTabs` è eliminato.
- **Intestazione su due righe:** a 360 px "Arancioni · 5" su una riga andava a capo a metà, quindi nome sopra e "5 atleti" in `caption` sotto.
- **`TeamDisplay`:** la prop `currentUserTeamIndex` (tab di default) diventa `viewerMarks` (id iscrizione → `"self"` | `"family"`), calcolata in `SessionPageClient` dalle iscrizioni di famiglia (`mine`, senza quelle da allenatore) con lo stesso `isSelf` del banner. `TeamsModal` usa `TeamsView` senza segni.
- **Testi:** `trainings.teamsVersus`, `viewerSelf`, `viewerFamily` in `it.json` ed `en.json`.
- **Verifiche:** `tsc --noEmit`, ESLint su `src/components/training/` e Vitest (2528 test) verdi. In Storybook a 360 × 800: 2 squadre, 2 squilibrate (metà vuote dove manca il ruolo), 3 squadre impilate, "Tu" sul proprio nome, un nome lungo che va a capo senza scorrimento orizzontale (`scrollWidth` = 360), tema scuro con il contorno sulla fascia dei Neri; da desktop il tabellone a 2 e l'ordine di lettura (una squadra intera e poi l'altra, colonna del ruolo nascosta). `npm run a11y` e la pagina vera con dati veri non provati: servono il dev server e il login di prova.
