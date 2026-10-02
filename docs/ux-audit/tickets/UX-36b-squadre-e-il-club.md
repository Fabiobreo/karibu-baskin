# UX-36b · `/squadre` solo squadre, pagina "Il club"

**Ondata:** 4 · **Stima:** M · **Dipende da:** UX-32, testi del club · **Stato:** da fare

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
