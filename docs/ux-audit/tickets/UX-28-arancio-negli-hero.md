# UX-28 · Arancio su elementi non toccabili: hero e icone decorative

**Ondata:** 3 · **Stima:** S · **Dipende da:** UX-07, UX-08 · **Stato:** fatto (commit su `develop`): scelta l'opzione **B** (27/09/2026), occhielli e icone degli hero neutri

## Problema

UX-07 ha stabilito che l'arancio pieno sta solo su ciò che si tocca (bottoni, link, tab attive, indicatori). Sono rimaste due eccezioni, lasciate aperte da UX-07 e UX-08:

- **Occhielli e icone arancioni dentro gli hero** (`primary.light` su grafite), per esempio in `/classifiche`, `/marcatori`, `/partite` e `/risultati` ("RISULTATI" con la coppa). Il contrasto regge, ma sono elementi informativi.
- **Icone decorative arancioni** fuori dagli hero: i valori in home ("Quello in cui crediamo"), le icone delle regole in `/il-baskin`, il titolo di `/profilo/traguardi`, i sondaggi.

Inoltre `calendar.match`, `match.draw` e `primary.dark` restano su `#BF360C` invece di `primary.fill` (`#C84B00`): tutti già sopra soglia col bianco, ma sono un terzo arancio.

## Decisione da prendere

| Opzione              | Cosa cambia                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **A. Tutto neutro**  | Occhielli degli hero in `heroText.secondary`, icone decorative in `text.secondary`. Regola di UX-07 applicata senza eccezioni. |
| **B. Solo gli hero** | Occhielli degli hero neutri; le icone decorative restano arancioni come tocco di marchio nelle sezioni chiare.                 |
| **C. Lasciare così** | L'arancio negli hero e nelle icone resta come firma del club; si documenta l'eccezione nella regola di UX-07.                  |

Servono schermate di confronto (in `docs/ux-audit/img/`) di home, `/risultati` e `/il-baskin` con le tre opzioni, prima di scegliere.

Tavole pronte (27/09/2026, tema chiaro, desktop): [home](../img/ux28-home.png), [/risultati](../img/ux28-risultati.png), [/il-baskin](../img/ux28-il-baskin.png). Le opzioni A e B sono simulate nella pagina: diventano neutre solo icone e occhielli non toccabili (dentro gli hero `rgba(255,255,255,0.72)`, fuori `text.secondary`); dati, titoli, marchio e tutto ciò che si tocca restano come sono.

## Cosa fare (dopo la decisione)

1. Applicare l'opzione scelta dai componenti condivisi (`PageHero`, `EntityHero`, occhiello di sezione) invece che pagina per pagina.
2. Allineare `calendar.match`, `match.draw` e `primary.dark` a `primary.fill`, se non ci sono motivi per tenerli separati.
3. Aggiornare la tabella "Decisioni già prese" del README.

## Criteri di accettazione

- Decisione annotata nel README.
- Nessun arancio fuori dalla regola scelta nelle pagine di UX-01, tema chiaro e scuro.

## Esito

- **Decisione:** opzione **B**, annotata nella tabella "Decisioni già prese" del README.
- **Hero:** in `/classifiche`, `/marcatori`, `/partite` e `/risultati` occhiello e icona passano da `primary.light`/`primary.main` a `heroText.secondary`; nel profilo giocatore l'occhiello "★ Karibu Baskin" non prende più il colore della squadra (che resta sull'anello dell'avatar). `PageHero` ed `EntityHero` erano già neutri: l'arancio stava negli hero scritti dentro le singole pagine, e lì è stato tolto.
- **Icone decorative nelle sezioni chiare:** restano arancioni, come previsto da B.
- **Terzo arancio:** dove `primary.dark` (`#BF360C`) faceva da fondo sotto un'etichetta bianca piena (etichetta "Oggi" dell'allenamento, "In corso" della partita, chip delle prossime partite, iniziali dell'avatar nell'header, link "Vai al contenuto") ora c'è `primary.fill` (`#C84B00`, 4,71:1). Restano separati, per un motivo:
  - `match.draw` e `calendar.match` si usano anche come **testo** su fondo chiaro ("1 pareggio", legenda), dove `primary.fill` si ferma a 4,28:1 sul crema;
  - l'intestazione di `CreateEventDialog` ha sopra del bianco all'80%, che su `primary.fill` scenderebbe sotto soglia;
  - gli hover (`ImageUploader`, `StatStepper`) usano `primary.dark` proprio perché più scuro.
- **Verifica:** una sonda su 20 pagine pubbliche e del profilo, in chiaro e in scuro, non trova più arancio su icone e occhielli non toccabili dentro gli hero. `npm run a11y` verde (84 misure), `tsc`, `npm test`, lint.
