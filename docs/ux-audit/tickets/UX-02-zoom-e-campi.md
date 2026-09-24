# UX-02 · Zoom consentito e campi a 16 px

**Ondata:** 0 · **Stima:** S · **Dipende da:** nessuno · **Stato:** fatto (commit su `develop`): zoom sbloccato, campi a 16px sui dispositivi touch dal tema

## Problema

`src/app/layout.tsx:105` imposta `maximumScale: 1`. Su Android Chrome impedisce di ingrandire la pagina con due dita: chi vede poco non può leggere. Viola WCAG 1.4.4. È presente dal primo commit, senza motivazione scritta.

Probabile motivo originale: su iOS Safari un campo di input con testo sotto i 16 px fa ingrandire la pagina da solo al focus. `maximumScale: 1` nasconde questo effetto. Togliendolo, i campi piccoli tornano a zoomare.

## Cosa fare

1. Togliere `maximumScale: 1` dal `viewport` in `src/app/layout.tsx`.
2. In `src/theme.ts`, override di `MuiInputBase` che porta il testo del campo a 16 px sui dispositivi touch:
   `"@media (pointer: coarse)": { fontSize: 16 }` sull'`input`.
3. Correggere gli `sx` locali che vincono sul tema e restano sotto i 16 px:
   - `src/components/matches/MatchStatsClient.tsx:538` (`0.82rem`), `:544` (`0.78rem`), `:578` (`0.78rem` in `inputProps.style`)
   - `src/components/teams/ClassificaInternaTable.tsx:247` (campo di ricerca, `0.82rem`)
   - `src/components/calendar/SubscribeCalendarDialog.tsx:90` (campo in sola lettura, 13 px)
4. Cercare altri campi con `fontSize` locale: `grep -rn "InputProps\|inputProps\|MuiOutlinedInput-root" src --include=*.tsx | grep fontSize`.

## Criteri di accettazione

- Su Android (o Chrome DevTools in emulazione) la pagina si ingrandisce con due dita.
- Su iOS Safari toccare un campo (statistiche, ricerca marcatori, login) non ingrandisce la pagina.
- axe non segnala più `meta-viewport`.
- Su desktop i campi mantengono la dimensione attuale.

## Esito

- `src/app/layout.tsx`: tolto `maximumScale: 1`, con un commento sul perché.
- `src/theme.ts`: `MuiInputBase` → `input` con `"@media (pointer: coarse)": { fontSize: 16 }`. La regola sta sull'`<input>`, quindi vince sui `fontSize` che gli `sx` locali mettono sul contenitore (`ClassificaInternaTable`, `SubscribeCalendarDialog`, i campi di `MatchStatsClient`). Per questo quegli `sx` sono rimasti: su desktop i campi mantengono la dimensione di prima, come chiede il ticket.
- `MatchStatsClient.tsx`: tolto il `fontSize` dallo `style` inline del campo note, l'unico punto che batteva il tema (uno `style` inline vince su qualunque regola CSS).
- Differenze rispetto al ticket: `MatchStatsClient.tsx:544` è un `Typography` (il trattino "non applicabile"), non un campo, e non causa zoom: lasciato. C'era un quarto punto non elencato (`:581`, `sx` del campo note), coperto dalla regola del tema. La ricerca estesa ha trovato solo `MatchResultDialog` e `GroupMatchInlineScore`, già a 16px o più.
- Verifica (Chromium, 390×844 con touch contro 1440×900): statistiche partita 13,1/12,5px → 16px su touch, ricerca `/marcatori` 13,1px → 16px su touch, login già a 16px; su desktop tutto invariato. `npm run a11y`: `meta-viewport` sparito da tutte le pagine, nessuna nuova violazione grave.

### Rimasto fuori / da sapere

- Da provare su un iPhone vero: nessun emulatore riproduce lo zoom automatico di Safari. Da provare anche su Android: pizzicare la pagina ora deve ingrandirla.
- `pointer: coarse` vale anche per i tablet: lì i campi passano a 16px anche nel layout largo.
- Il `fontSize: 13` scritto a mano in `SubscribeCalendarDialog` resta (vale ormai solo su desktop): se ne occupa la migrazione tipografica di UX-10.
