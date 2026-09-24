# UX-02 · Zoom consentito e campi a 16 px

**Ondata:** 0 · **Stima:** S · **Dipende da:** nessuno · **Stato:** da fare

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
