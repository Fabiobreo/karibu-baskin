# UX-39 · Footer a tre colonne e nastro sponsor normalizzato

**Ondata:** 4 · **Stima:** M · **Dipende da:** nessuno · **Stato:** da fare

## Problema

**Vincolo:** la visibilità degli sponsor è decisa e non si riduce (nastro su ogni pagina pubblica, foto dell'hero, `/sponsor`, sezione in Contatti). Questo ticket migliora **come** sono mostrati, non quanto.

**Nastro** (`src/components/common/SponsorBanner.tsx`):

- loghi di qualità molto diversa nella stessa tessera bianca: uno è un rettangolo nero con una foto, altri sono minuscoli;
- didascalie troncate ("Villani and Partn…", "Denis M. Photogr…");
- `image-redundant-alt` su 6 nodi in ogni pagina pubblica (il nome è sia nell'`alt` sia nella didascalia);
- è inserito fra il contenuto e il footer, quindi ogni pagina finisce con la stessa fascia animata, anche login e profilo.

**Footer** (`src/components/layout/Footer.tsx`):

- solo logo, social, copyright e due link;
- mancano indirizzo della palestra, orari, email e telefono, menu: proprio quello che un genitore cerca in fondo alla pagina;
- usa `style={{ fontSize }}` fuori dalla scala (vedi UX-31).

## Cosa fare

1. **Loghi:**
   - tessere di dimensione fissa con padding uniforme e logo contenuto (`object-fit: contain`);
   - per i loghi con fondo proprio, un fondo neutro coerente;
   - senza didascalie visibili: nome nell'`alt` e nel link;
   - valutare con il club una versione monocromatica al passaggio del mouse / a colori al focus. Da chiedere agli sponsor se toccati: la visibilità promessa è "logo in ogni pagina".
2. **Posizione:** il nastro diventa la fascia superiore del footer (stessa visibilità, un solo blocco di chiusura).
3. **Movimento:** restano il bottone di pausa e il nastro fermo con `prefers-reduced-motion` (già così, `SponsorBanner.tsx:205`). Valutare il nastro fermo anche sulle pagine d'uso (login, profilo, notifiche), con lo scorrimento solo nelle pagine pubbliche di contenuto. Decisione da confermare col club.
4. **Footer a tre colonne** (una su mobile):
   - **Dove e quando:** sede (`CLUB_VENUE`), orari tipici, link "Vieni a provare";
   - **Link:** allenamenti, calendario, partite, il Baskin, FAQ, sponsor;
   - **Contatti:** email, telefoni, social, dati associazione (C.F., affiliazione, oggi solo in `/contatti`).

## Criteri di accettazione

- Nessuna didascalia troncata; `image-redundant-alt` sparita.
- Footer con indirizzo, email e link alle FAQ su ogni pagina pubblica.
- Stessi sponsor, stesso ordine, visibili su ogni pagina pubblica (verifica della promessa).
- Testi in `it.json` ed `en.json`; `npm run a11y` verde.
