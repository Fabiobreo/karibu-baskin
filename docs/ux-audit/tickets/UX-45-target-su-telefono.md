# UX-45 · Target da 44 px su telefono: footer, disponibilità, filtri dei marcatori

**Ondata:** 5 · **Stima:** S · **Dipende da:** nessuno · **Stato:** fatto (03/10/2026)

Nato dal [riaudit del 02/10/2026](../RIAUDIT-2026-10-02.md), problemi 1, 6 e 5. Rivisto il 03/10/2026 prima di lavorarlo (vedi "Revisione").

## Problema

Su telefono (390 px) tre gruppi di controlli sono più bassi dei 44 px raccomandati. Sono tutti sopra il minimo WCAG di 24 px, quindi `npm run a11y` è verde, ma una parte del pubblico del sito ha difficoltà motorie.

- **Footer** (`src/components/layout/Footer.tsx`), ricaduta di UX-39: 19 link per pagina, larghi 55-136 px e alti 28, uno sotto l'altro. I target sotto 44 px in home sono passati da 6 (29/09) a 26; in `/marcatori` da 43 a 60.
- **Disponibilità** (`src/components/matches/MieDisponibilitaClient.tsx`): i bottoni Sì / No di ogni partita sono alti circa 27 px (dal codice: `py: 0.25`, testo a 12 px) e larghi circa 50, attaccati l'uno all'altro. È il compito più frequente dell'atleta dopo l'iscrizione.
- **`/marcatori`**: i chip "Tutti / Ruolo 1 … Ruolo 5" sono alti 24 px, quelli della stagione (`SeasonSelector`) 32.

## Cosa fare

1. **Footer**, sotto `md` (fino a 900 px il footer è a una colonna, e un tablet si usa col dito):
   - ogni link è alto 44 px. La griglia dei link del sito **resta a due colonne**: 44 px è l'altezza della riga, non "un link per riga" (nove righe allungherebbero di 400 px un footer che ne aggiunge già 800-1.000 a ogni pagina);
   - nei telefoni si tocca tutta la riga "nome + numero", non solo il numero;
   - le tre icone social passano da 36 a 44 px;
   - anche il link alla privacy nella riga legale.
     Da `md` in su resta com'è.
2. **Disponibilità**, su telefono: Sì / No alti 44 px **e larghi almeno 64**, con il testo a 14 px. Sì e No sono attaccati e dicono l'opposto: il rischio non è mancare il bottone, è toccare quello sbagliato, e lo riduce la larghezza. Il nome a sinistra si accorcia, i bottoni no. Non si copia `EventRsvp` (lì i bottoni occupano tutta la riga, qui c'è il nome accanto).
3. **Chip** di ruolo in `/marcatori` e di stagione in `SeasonSelector`, su telefono: alti 44 px **a vista**, non con un'area invisibile più grande (chi fatica a mirare ha bisogno di vedere il bersaglio, e `rimisura.mjs` misura il riquadro dell'elemento). Testo a 14 px, stesso trattamento per i due gruppi. `SeasonSelector` è condiviso da `/risultati`, `/classifiche` e `/marcatori`: il cambio vale per tutte. I 40 px in più in cima a `/marcatori` li recupera UX-48.

## Criteri di accettazione

Contati come in `rimisura.mjs` (`touchTargets`, che guarda il **lato minore**: conta anche la larghezza).

- A 390 px: nessun link né icona del footer sotto 44 px; home anonima sotto 10 target piccoli.
- A 390 px: Sì / No della disponibilità almeno 64 × 44 px (misurati prima e dopo).
- A 390 px: chip di ruolo e di stagione alti 44 px. In `/marcatori` i target piccoli scendono da 60 a non più di 35: spariscono i 19 del footer e i chip, restano quelli del contenuto (nomi in tabella, ordinamento, paginazione), che sono di UX-48 e di UX-40.
- A 768 px il footer ha i link da 44 px.
- A 1.440 px footer, disponibilità e marcatori sono identici a oggi.
- `npm run a11y` verde, nessuna pagina più larga dello schermo a 360 px.

## Revisione (03/10/2026)

Il ticket ragionava solo in altezza. Cinque correzioni, già riportate sopra:

1. "Una riga da 44 px" nel footer era ambiguo: è l'altezza della riga, la griglia a due colonne resta.
2. `TOUCH_TARGET_ON_PHONE` si ferma a 600 px ma il footer è a una colonna fino a 900: per il footer la soglia è `md`.
3. Disponibilità: larghezza minima e testo a 14 px, non solo altezza.
4. Chip: 44 px a vista, uguali per stagione e ruolo.
5. Criteri: numero atteso per `/marcatori`, misura dei Sì / No, larghezza oltre all'altezza.

## Esito (03/10/2026)

Misure dal DOM sul dev server, come `touchTargets` di `rimisura.mjs`.

| Dove                             | Prima                                     | Dopo                                                                                  |
| -------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------- |
| Footer a 390 px                  | 19 link alti 28, social 36                | 32 bersagli, nessuno sotto 44 (il più stretto 44 × 44)                                |
| Footer a 768 px                  | come a 390                                | nessuno sotto 44                                                                      |
| Home anonima a 390 px            | 26 sotto 44                               | 6, di cui 4 non del sito (banner cookie, strumenti di sviluppo)                       |
| `/marcatori` a 390 px            | 60 sotto 44                               | 36, di cui 4 non del sito: restano nomi in tabella, ordinamento e paginazione         |
| Chip di ruolo / stagione, 390 px | 24 / 32 px, testo 12 / 13                 | 44 px, testo 14                                                                       |
| Sì / No disponibilità, 390 px    | 47 × 27 e 52 × 27, testo 12               | 64 × 44, testo 14                                                                     |
| 1.440 px                         | footer alto 479, chip 24 / 32, Sì / No 27 | invariati (unica differenza: nei telefoni del footer il link comprende anche il nome) |

Nessuna pagina più larga dello schermo, `npm run a11y` senza nuove violazioni gravi, `npm test` verde. Il nuovo `TOUCH_CHIP_ON_PHONE` di `@/lib/touchTarget` porta un chip a 44 px su telefono.

## Rimasto fuori

- Il resto di `/marcatori` su telefono (ordine dei blocchi, "in prestito"): [UX-48](UX-48-marcatori-su-telefono.md).
- Link del breadcrumb e frecce della paginazione sotto 44 px: comuni a tutto il sito, già segnati in UX-40.
- **Due modelli per la stessa domanda:** i Sì / No della disponibilità sono verde e rosso con l'icona, quelli degli eventi (`EventRsvp`) arancio senza icona. Unificarli tocca la palette chiusa di UX-29: decisione del committente, non di questo ticket.
