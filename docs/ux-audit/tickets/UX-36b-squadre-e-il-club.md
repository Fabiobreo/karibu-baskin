# UX-36b · `/squadre` solo squadre, pagina "Il club"

**Ondata:** 4 · **Stima:** M · **Dipende da:** UX-32, testi del club · **Stato:** fatto (su `develop`, 02/10/2026), con due scelte del committente diverse dal testo qui sotto (vedi "Com'è andata")

> Nato il 01/10/2026 dalla divisione di UX-36: la navigazione della sezione Partite è in [UX-36a](UX-36-navigazione-partite.md).

## Problema

`/squadre` si intitola "ASD Karibu Baskin" e fa anche da "chi siamo": sottotitolo con la storia ("Nati nel 2015… Oltre 80 atleti, 2 squadre") e, subito sotto, quattro tessere che ripetono gli stessi numeri, scritti a mano nel codice ("2015", "80+", "2", "1°"). Nel menu **Squadre ▾** la prima voce si chiama "Chi siamo" ma porta a `/squadre`.

## Decisione (30/09/2026)

- **Pagina propria "Il club"** (`/il-club`): presentazione, numeri e storia escono da `/squadre`.
- **Navigazione:** la voce "Chi siamo" del menu **Squadre ▾** punta a `/il-club`. Nessun altro cambio al menu principale, il cui riordino resta parcheggiato (quando lo si farà, la candidata è un gruppo "su di noi" con Contatti, FAQ e Sponsor). Link anche nel footer.
- **Home invariata:** il blocco "Chi siamo" della home resta com'è.

## Cosa fare

1. `/squadre`: titolo "Squadre", sottotitolo di una riga sulle squadre; restano squadre della stagione, simulatore e archivio, più al massimo una riga "Chi siamo →" verso `/il-club`. Via le quattro tessere.
2. `/il-club`: presentazione, numeri, valori e storia, con `PageHero` e colonna `reading`. Numeri calcolati dal database dove si può; scritti a mano solo anno di fondazione e titoli.
3. Menu **Squadre ▾** e footer: "Chi siamo" verso `/il-club`. Aggiornare sitemap e pagine pre-cachate dal service worker se serve.

## In attesa di

- **Testi del club:** valori e storia li scrive il club (come per UX-21). Senza, la pagina nasce vuota.
- **Definizione di "atleti tesserati":** la rosa attiva di `@/lib/athletes` darà un numero preciso, probabilmente diverso da "80+". Va confermato con il club quale numero mostrare.

## Rischi da tenere d'occhio

- Dire le stesse cose in tre posti: blocco "Chi siamo" della home, `/il-club` e `/il-baskin`. La home resta un invito breve che rimanda a `/il-club`.
- Dati strutturati: `SportsOrganization` è già in home; non duplicarlo.

## Criteri di accettazione

- `/squadre` parla solo di squadre; nessun numero del club scritto a mano nel codice, tranne anno di fondazione e titoli.
- "Chi siamo" porta a una pagina che si intitola come la voce.
- Testi in `it.json` ed `en.json`; `npm run a11y` verde.

## Com'è andata (02/10/2026)

**Il blocco sui testi non c'era.** Valori e storia erano già nel sito, per intero, nel blocco "Chi siamo" della home ("Quello in cui crediamo", "10 anni di Karibu"). L'unica storia scritta dal club è la pagina [La nostra storia](https://sites.google.com/view/asd-karibu/la-nostra-storia) del vecchio sito: dice le stesse cose, più in breve.

**Decisioni del committente (02/10):**

- **Si tengono entrambi:** la home resta com'è e `/il-club` mostra gli stessi valori e la stessa storia. Per non avere due copie da allineare, i due blocchi sono componenti condivisi (`ClubValues`, `ClubHistory` in `src/components/common/`) che leggono gli stessi testi (`home.values`, `home.storia`).
- **Il numero degli iscritti non si prende dal database.** Resta nel testo della storia ("oltre 80 iscritti"), che è del club. Il punto 2 di "Cosa fare" ("numeri calcolati dal database") e il primo criterio di accettazione sono superati da questa scelta. La fonte del club parla di **iscritti**, non di "atleti tesserati".

**Cosa è cambiato:**

- `/squadre`: titolo "Squadre", sottotitolo di una riga, via le quattro tessere e le loro chiavi dai dizionari.
- `/il-club` (h1 "Chi siamo", colonna `reading`): presentazione, valori, storia, rimando alle squadre e dati dell'associazione (nome, codice fiscale, affiliazione EISI ETS nr. VEN10, sede). Niente JSON-LD (resta in home).
- Menu **Squadre ▾**: "Tutte le squadre" (prima `/squadre` si raggiungeva solo dalla voce "Chi siamo"), le squadre della stagione, "Archivio", "Chi siamo" verso `/il-club`. Stessa voce nel footer. Pagina in sitemap e in `npm run a11y`.

**Verifiche:** `tsc`, `npm test`, `npm run a11y` verdi; `/il-club`, `/squadre` e il menu guardati nel browser.

**Contro-revisione (02/10) e correzioni:** il sottotitolo di `/squadre` non dice più "questa stagione" (a inizio stagione la pagina mostra quella passata); in `/il-club` l'indirizzo ha il nome del palazzetto e l'etichetta "Dove siamo" (non "Sede", che accanto al codice fiscale si leggeva come sede legale); l'affiliazione sta in `CLUB_AFFILIATION`, usata anche da Contatti.

**Rimasto fuori:**

- Affiliazione: il vecchio sito del club e le pagine Contatti e Privacy scrivevano "ENSI ETS"; il committente ha confermato che l'ente è **EISI** (02/10). Corretto in `CLUB_AFFILIATION`, l'unico posto da cui la leggono `/il-club`, Contatti e Privacy.

- Service worker: `/il-club` non è fra le pagine pre-cachate (richiede di alzare `VERSION`).
- Due testi del club sono datati: "due squadre nei campionati Veneto 2025/2026" (valore "Impegno") e la tappa 2025 della storia. Ora compaiono in due pagine: da aggiornare con il club.
- `/squadre`: la stagione è detta tre volte (chip, occhiello, titolo) senza `SeasonSelector`. Corretti invece il bottone del simulatore (ora secondario: il pieno resta l'invito in fondo) e l'hover delle card (bordo arancio, niente ombra né sollevamento).
- `/la-squadra` reindirizza ancora a `/squadre`.
