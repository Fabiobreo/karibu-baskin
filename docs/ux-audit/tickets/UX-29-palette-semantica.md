# UX-29 · Palette semantica chiusa e colori squadra per identità

**Ondata:** 4 · **Stima:** M · **Dipende da:** nessuno · **Stato:** fatto (su `develop`, un commit per area)

## Problema

UX-07 ha fissato "arancio solo su ciò che si tocca", ma il colore ha ancora più significati. Nel riaudit del 29/09 ([RIAUDIT-2026-09-29.md](../RIAUDIT-2026-09-29.md), punto 1):

- **Arancio** = azione, marchio, squadra (Kapuleti 2025-26 `#E65100`, Karibu `#FF6D00`, "Montekki (sim)") e pareggio (`match.draw`). In più è il ripiego quando una squadra non ha colore: `t.color ?? "primary.main"` in `ClassificaInternaTable.tsx:447` e `:581` e in `GironeFullView.tsx:151`.
- **Verde** = vittoria, Montekki 2025-26 (`#43A047`) e il ruolo utente "Genitore" in `/admin/utenti`.
- **Stessa squadra, due colori.** `CompetitiveTeam.color` sta sul record della stagione (`prisma/schema.prisma:358`), quindi Kapuleti è rosso `#C62828` nel 2026-27 (`/partite`, `/squadre`, `/calendario`) e arancione `#E65100` nel 2025-26 (`/risultati`, `/classifiche`, `/marcatori`). Lo stesso vale per Montekki (blu, poi verde).
- **Altre tinte:** calendario (allenamento verde acqua, evento blu, `lightCalendar`/`darkCalendar` in `theme.ts`), numeri KPI della dashboard admin (verde acqua e blu da `palette.admin`), chip del ruolo utente in admin (Atleta blu, Genitore verde, Ospite grigio).

Effetto: circa 10 tinte con significati sovrapposti. L'occhio smette di fidarsi del colore e deve leggere tutto: un chip squadra arancione sembra un bottone, uno verde sembra "ha vinto".

## Cosa fare

1. **Regola scritta in CLAUDE.md** (sezione Convenzioni): arancio (`primary`) solo per azioni e stato attivo; `match.win/loss/draw` solo per l'esito; nessun altro significato per verde, rosso e ambra.
2. **Palette squadre** in `theme.ts` (`palette.team`, 6 tinte in chiaro e in scuro) che **esclude** arancio, verde, rosso e ambra: per esempio blu, viola, verde acqua scuro, ardesia, bordeaux, senape scuro, da verificare a 3:1 sul bianco come elemento grafico. Il selettore colore di `AdminSquadreClient` propone solo queste tinte (oggi 8 costanti libere).
3. **Colore alla creazione della squadra:** precompilato come da decisione A (vedi sotto).
4. **Ripiego:** dove oggi c'è `t.color ?? "primary.main"`, usare un neutro (`text.secondary`) o la prima tinta di `palette.team`, mai l'arancio.
5. **Pareggio:** `match.draw` passa dall'arancio all'ambra/senape (resta leggibile come testo, vedi le note di UX-28 sul contrasto), così non coincide più col marchio.
6. **Ruolo utente in admin:** chip neutri con icona (Atleta, Genitore, Ospite), senza verde e blu.
7. **Calendario:** tipi distinti da icona e forma del chip (pieno o contornato), con una sola tinta di marchio per le partite; allenamento ed evento in neutri.
8. **KPI della dashboard admin:** numeri in `text.primary`; l'accento sta solo sulla card che chiede un'azione (oggi "Allenamenti da completare").

## Decisione da prendere

| Opzione                     | Cosa cambia                                                                                                                                                                        |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Precompilazione**      | Nessun cambio di modello: la nuova stagione eredita il colore dalla squadra con lo stesso nome. I dati vecchi si allineano con uno script una tantum.                              |
| **B. Colore sull'identità** | Nuovo campo (o modello `TeamIdentity`) condiviso fra le stagioni della stessa squadra; `CompetitiveTeam.color` diventa un ripiego. Richiede migration e aggiornamento delle query. |

A è sufficiente se lo staff non vuole colori diversi per stagione.

**Decisione (30/09/2026): A.** I nomi delle squadre cambiano quasi ogni stagione (All Stars e Dream Team, poi Montekki e Kapuleti, quest'anno KariGin e KariTonic), quindi non esiste un'identità da conservare fra un anno e l'altro e B non serve. Il colore è della squadra di quella stagione.

- Alla creazione, se nella stagione precedente c'è una squadra con lo stesso nome se ne propone il colore; altrimenti la prima tinta di `palette.team` non ancora usata nella stessa stagione. Resta modificabile.
- Nessuno script di allineamento dei dati vecchi.
- Il criterio "stessa squadra, stesso colore ovunque" vale per la squadra di una stagione: le pagine che mostrano stagioni diverse mostrano squadre diverse.

## Sistema definitivo (30/09/2026)

Nato da due revisioni indipendenti (una designer UI/UX per i significati, un esperto di colore per i valori, tutti verificati con script: contrasto WCAG, CIEDE2000, daltonismo Machado 2009 a severità piena) e dalle scelte del committente. **La palette è chiusa**: una tinta o un significato nuovo si discutono prima con il committente.

**Una tinta, un significato; il resto è neutro.**

| Famiglia              | Significato unico                                                                           | Token                                                        |
| --------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Arancio               | si tocca, oppure è attivo/selezionato                                                       | `primary.*`                                                  |
| Nero del marchio      | superficie di marchio, neutro invertito (In corso, Oggi, Casa, chip partita del calendario) | `secondary.*`, `appBar`, `heroGradient`                      |
| Verde / ambra / rosso | valenza: positivo / a metà / negativo                                                       | `success` / `warning` / `error`, alias `match.win/draw/loss` |
| Tinte squadra (6)     | identità della squadra di una stagione, solo grafico o riempimento, mai testo               | `palette.team`, da `@/lib/teamColors`                        |
| Metalli               | livello e onore, sempre con una forma                                                       | `medal.*`                                                    |
| Eccezioni chiuse      | casacche d'allenamento (col nome), marchi social                                            | `palette.bib`, `socialBrandColor`                            |

`info` è neutro. `status`, `admin`, `stats` e `calendar` escono dal tema: tipi, stati temporali, ruoli, KPI e statistiche si distinguono con icona, forma o parola. Ogni colore ha un secondo segnale (WCAG 1.4.1).

**Tinte squadra** (stesso hex in chiaro e in scuro: finestra di luminanza 0,139-0,183, etichetta bianca ≥ 4,5:1, ≥ 3:1 su tutte le superfici dei due temi). Ordine = ordine di proposta per una squadra nuova; Ardesia è della Karibu.

| Chiave      | Nome             | Hex       | Bianco sopra | su #1E1E1E |
| ----------- | ---------------- | --------- | ------------ | ---------- |
| `blue`      | Blu              | `#4B6FCD` | 4,71         | 3,54       |
| `raspberry` | Lampone          | `#B05583` | 4,69         | 3,55       |
| `taupe`     | Tortora          | `#8A6E60` | 4,69         | 3,56       |
| `violet`    | Viola            | `#7F5AA6` | 5,36         | 3,11       |
| `petrol`    | Petrolio         | `#167F8E` | 4,71         | 3,54       |
| `slate`     | Ardesia (Karibu) | `#5C6E76` | 5,32         | 3,13       |

Il bordeaux e il senape proposti sopra sono stati sostituiti: il primo finiva a ΔE 11-17 dal rosso della sconfitta, il secondo coincideva col pareggio. Le prime tre tinte distano ΔE ≥ 23 fra loro (≥ 12 con daltonismo).

- **Nel database** si salva la chiave (`"blue"`); `teamTint()` accetta chiave, hex della palette o colore storico e lo porta sulla tinta per settore di tinta OKLCH (grigi → Ardesia; rossi e rosa → Lampone; arancio, oro, marrone → Tortora; verdi e ciano → Petrolio; blu → Blu; viola → Viola). Nessuno script sui dati.
- **Senza colore** nessun segno (niente pallino, fascia o riempimento), mai l'arancio.
- **Esiti:** pareggio e `warning` ambra `#816512` (chiaro) / `#DEBA50` (scuro), fondo `#F8EED1` / `#322B16`; `success` = vittoria, `error` = sconfitta (`#C62828` / `#EF5350`).
- **Grafici:** serie in inchiostro (`text.primary`), poi Blu e Lampone; riferimento `text.secondary` tratteggiato.
- **Bordo dei campi:** nuovo `border.control` (`#8A8580` / `#6E6E6E`, ≥ 3:1): il bordo attuale si fermava a 1,6-2,1:1 (WCAG 1.4.11).
- **Scelte del committente:** badge dei ruoli Baskin grafite pieno `#4A4A4A` uguale per tutti (il numero è l'informazione; le 5 tinte di prima erano le stesse famiglie delle squadre); la parola "Baskin" dell'hero resta arancione come logotipo, senza alone; la sottolineatura arancione della voce attiva del menu resta (stato attivo).
- **Limiti dichiarati:** l'oro delle medaglie in chiaro coincide col pareggio (ΔE 2,5): vivono in componenti diversi, sempre con forma o etichetta. Alcune coppie di tinte 4-6 scendono sotto ΔE 8 con daltonismo: il nome accompagna sempre il colore.

## Criteri di accettazione

- Nessuna squadra con arancio, verde o rosso come colore; nessun ripiego arancione.
- La stessa squadra ha lo stesso colore in `/partite`, `/risultati`, `/classifiche`, `/marcatori`, `/squadre` e `/calendario`.
- Nelle pagine di `npm run a11y`, in chiaro e in scuro, l'arancio compare solo su elementi toccabili e stato attivo (sonda come in UX-28).
- `npm run a11y` verde.

## Com'è andata

- **Fonte unica:** `src/lib/palette.ts` è l'unico file con valori di colore. Tema MUI, `heroStyles`, OG, tabellino, email, `global-error`, `layout` (`themeColor`), `colorUtils` e l'immagine delle squadre leggono da lì. `globals.css` ripete i due fondi per il primo paint (commentato).
- **Squadre:** `@/lib/teamColors` (`teamColor`, `teamTint`, `suggestTeamTint`, `TEAM_TINTS`) e i componenti `TeamColorDot` e `TeamChip`. Lo schema Zod accetta solo le chiavi della palette; il selettore di `/admin/squadre` propone le 5 tinte assegnabili, precompila con la squadra omonima dell'anno prima o la prima libera, avvisa se la tinta è già presa nella stagione. La Karibu è Ardesia (`ensureClubTeam`).
- **Stati temporali:** `StatusPill` (invertita, contornata, tenue; pallino pulsante per "In corso"; `onDark` sugli hero). Niente più verde per "In corso" né verde/blu per casa e trasferta.
- **Calendario:** tipo = forma + icona (partita piena, allenamento contornato, evento tenue), squadra = fascia, "tua squadra" = eco nella tinta; `eventVisual` riscritto con i test.
- **Admin:** barra neutra con l'arancio solo sulla voce attiva; KPI in `text.primary` con l'accento solo su "Allenamenti da completare" quando ce ne sono; chip del ruolo utente e dello stato atleta neutri con icona (`@/components/common/appRoleIcons`); registro attività con prima/dopo neutri.
- **Ruoli Baskin:** grafite per tutti (`role.main`, `roleColorSx`, `RoleBadge`); tolti `roleColor` e `ROLE_TEXT_COLOR`. Filtri per ruolo: selezionato = arancio (stato attivo).
- **Valenza:** `success`/`warning`/`error` fuori dalle partite; falli a 4 in ambra con tooltip, a 5 in rosso con icona. Grafici in inchiostro, il confronto con B tratteggiato e marcatori quadrati.
- **Casacche:** `TEAM_META` legge da `BIB`; `bibFill()` dà il riempimento sotto l'etichetta bianca (l'arancio della maglia col bianco fa 3,78:1, quello del marchio 4,71:1).
- **Bordo dei campi:** `border.control` nel tema (≥ 3:1, WCAG 1.4.11).
- **Guardrail:** ESLint segnala hex e `rgb()` fuori da `palette.ts` (ombre escluse; test e storie esenti), i ripieghi sul colore squadra (`x.color ?? …`), i token tolti (`status`, `admin`, `stats`, `calendar`) e `color="info"`. `palette.test.ts` tiene fermi i contrasti e il manifest, `teamColors.test.ts` la mappatura dei colori storici.
- **Misure:** "colori esadecimali fuori dal tema" da 91 a 0 (`misura-codice.mjs` conta `palette.ts` come tema). Sonda "arancio su elementi non toccabili" su 12 pagine pubbliche: resta solo dove è ammesso (voce di menu e giorno correnti, "Baskin" dell'hero, icone decorative UX-28 B, `<summary>` delle regole). `tsc`, lint, `npm test` (1.930) e `npm run a11y` (84 misure, 0 violazioni gravi) verdi.
- **Come si è lavorato:** una designer UI/UX e un esperto di colore hanno scritto specifica e valori; l'implementazione è stata divisa in sei aree senza file in comune.

### Rimasto fuori

- **Banner compleanni** (`BirthdayBanner`): fascia arancione piena su un elemento che non si tocca, con testo bianco a circa 3,8:1. Da decidere col committente (fascia scura con accento, o riempimento `orangeFill`).
- `AdminNewsClient` "Pubblicato" e `AdminGalleryClient` "Visibile" restano `success`: sono stati, non valenze in senso stretto. Da valutare.
- Testi italiani scritti a mano trovati durante il lavoro, non legati al colore: `aria-label` di `GalleryGrid`, "Statistiche"/"Stagione"/"Ruolo N" nella pagina squadra, "Karibu" in `NextMatchCard`, etichette delle medaglie del giocatore.

## Revisione del 30/09/2026: famiglie di maglia e ruoli colorati

Il committente ha aggiunto due vincoli: **il colore di una squadra deve poter essere quello della sua maglia** (quest'anno KariGin viola e KariTonic verde; in futuro anche arancione e giallo/oro), riconoscibile per famiglia, e **i ruoli Baskin tornano colorati**. L'esperto di colore ha rifatto l'ottimizzazione congiunta di squadre, ruoli ed esiti (stesso metodo).

**Tinte squadra** (ordine di proposta; un solo hex per i due temi; etichetta per tinta):

| Chiave | Nome | Hex | Etichetta | Note |
| --- | --- | --- | --- | --- |
| `violet` | Viola | `#835BA5` | bianca 5,24 | |
| `green` | Verde | `#059767` | scura 5,08 | smeraldo, a ΔE 12,5 dalla vittoria |
| `blue` | Blu | `#3788F4` | scura 5,37 | |
| `orange` | Arancio | `#C27010` | scura 5,06 | verso l'ambra, a ΔE 12,8-13,3 dall'arancio dei bottoni |
| `gold` | Oro | `#C3A322` | scura 7,46 | 2,45:1 sul bianco: anello `TEAM_RING` sulle superfici chiare |
| `raspberry` | Lampone | `#AF4973` | bianca 5,22 | |
| `slate` | Ardesia (Karibu) | `#6B828A` | scura 4,68 | |

**Ruoli** (numero bianco ≥ 9:1, bordo `border.role` in scuro): 1 blu notte `#253496`, 2 verde abete `#1E5142`, 3 oliva `#394F01`, 4 prugna `#392442`, 5 terra `#472117`. Squadre nella fascia di luminanza media, ruoli in quella scura: la luminanza è l'unico asse che regge anche il daltonismo.

**Pareggio in tema scuro:** da ambra `#DEBA50` a sabbia `#D6C298` (fondo `#2E2A20`), per staccarsi dall'Oro squadra (da ΔE 7,1 a 16,1). In chiaro invariato.

**Minimi (ΔE00 normale / daltonismo):** squadra-squadra 17,7 / 9,4; ruolo-ruolo 18,1 / 11,7; ruolo-squadra 19,4 / 12,8. Coppie deboli dichiarate: Arancio squadra e arancio dei bottoni con daltonismo (1,8: li separano il nome della squadra e la forma di bottone), Verde squadra e vittoria (12,5 / 10,5: la lettera sul chip dell'esito), Oro e medaglie/pareggio (≥ 13,4: posizione sulla medaglia, lettera sul pareggio). La fascia oro nei pannelli chiari non ha l'anello tranne nel calendario: il nome della squadra le sta sempre accanto.

**Mappatura dei colori storici** per famiglia: rossi e rosa → Lampone, arancio e marroni → Arancio, oro/giallo/oliva → Oro, verdi e verde acqua → Verde, azzurri e blu → Blu, viola → Viola, grigi → Ardesia. Escono Tortora e Petrolio. `teamFill()` porta fondo, etichetta e anello a chip, intestazioni di card e avatar; `TeamChip` e le immagini OG lo usano.
