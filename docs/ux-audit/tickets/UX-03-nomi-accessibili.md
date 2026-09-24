# UX-03 · Nomi accessibili e struttura dei titoli

**Ondata:** 0 · **Stima:** S · **Dipende da:** nessuno · **Stato:** fatto (commit su `develop`): nomi accessibili su campi, select, barre e immagini; `h1` nel profilo giocatore; liste delle notifiche valide

## Problema

axe segnala controlli che un lettore di schermo annuncia senza nome ("campo modifica, 0") e pagine senza titolo principale. Casi rilevati:

| Dove                                                              | Problema                                                                  | Correzione                                                        |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `src/components/matches/MatchStatsClient.tsx:520`, `:570`         | 6 campi numerici per giocatore senza etichetta (axe: `label`, critical)   | `inputProps={{ "aria-label": \`${colonna}, ${nomeGiocatore}\` }}` |
| `src/components/admin/userList/UsersTable.tsx:172`                | select di ruolo e squadra in ogni riga senza nome (50 in `/admin/utenti`) | `inputProps={{ "aria-label": \`Ruolo di ${nome}\` }}` e simili    |
| `src/components/admin/AdminNotificationSender.tsx:199`, `:237`    | select "Squadra" e "Ruolo Baskin" senza nome accessibile                  | `labelId` collegato all'`InputLabel`                              |
| `src/components/rating/BadgeShowcase.tsx`, `AchievementsGrid.tsx` | `LinearProgress` dei prossimi traguardi senza nome                        | `aria-label="10 partite: 6 su 10"` (testo tradotto)               |
| `src/app/giocatori/[slug]/page.tsx:664`                           | il nome del giocatore è un `h2`: la pagina non ha `<h1>`                  | `component="h1"` mantenendo lo stile                              |
| `src/components/notifications/NotificheClient.tsx:157`            | `<List>` con figli `<Box>` (`<ul>` con `<div>`)                           | `ListItem` o `component="li"` sui figli                           |
| `src/components/layout/BottomNav.tsx:129`                         | `Avatar` con foto senza `alt`                                             | `alt` con il nome, o `alt=""` se l'azione ha già un'etichetta     |
| `src/components/admin/userList/UsersTable.tsx`                    | icone di azione 19×19 px (axe: `target-size`)                             | `size="medium"` o area di tocco di almeno 24 px                   |

Inoltre, ordine dei titoli: molti titoli di sezione sono `h6` o `subtitle` resi come titolo e saltano livelli (axe: `heading-order` su quasi tutte le pagine). In questo ticket correggere solo le pagine sopra; il resto rientra in UX-10.

## Criteri di accettazione

- Sulle pagine citate axe non segnala più `label`, `aria-input-field-name`, `aria-progressbar-name`, `page-has-heading-one`, `list`, `image-alt`.
- Testi nuovi della UI pubblica in `it.json` ed `en.json` (le etichette dell'admin restano in italiano).

## Esito

- **Statistiche partita** (`MatchStatsClient`): `aria-label` su ogni campo numerico (`"Tiri liberi, Mario Rossi"`, dal `title` della colonna) e sul campo note (`"Note, Mario Rossi"`).
- **`/admin/utenti`**: `aria-label` sulla select del ruolo (`"Ruolo utente di …"`) e su quella della squadra. `TeamCellSelect` ha ora la prop obbligatoria `ariaLabel`, passata anche dalla scheda Figli (`ChildrenTab`). Le icone conferma/rifiuta del ruolo suggerito passano da 19×19 a 25×25 px (tolto il `p: "2px"`) e hanno un `aria-label` con il nome.
- **`AdminNotificationSender`**: `labelId` collegato agli `InputLabel` di "Squadra" e "Ruolo Baskin".
- **Traguardi** (`BadgeShowcase`, `AchievementsGrid`): `aria-label` con il nome del traguardo e `aria-valuetext` tradotto ("6 su 10" / "6 of 10", chiave nuova `badgeProgress.value` in `it.json` ed `en.json`).
- **Profilo giocatore**: nome in `component="h1"`, stile invariato.
- **Notifiche** (`NotificheClient` e, con lo stesso difetto, `NotificationDropdown`): ogni voce è un `<li>` che contiene anche il divisore; la variante senza link di `NotificationItem` ora è un `div` (prima era un `<li>`, e sarebbe finito annidato).
- **Immagini**: invece di correggere solo `BottomNav`, `alt=""` di default per `MuiAvatar` nel tema. Le foto degli avatar (una trentina di punti) stanno sempre accanto al nome della persona, quindi sono decorative. Dove la foto è l'unico contenuto si passa un `alt` esplicito: il menu utente dell'header lo aveva già.

Verifica: `npm run a11y` non segnala più `label`, `aria-input-field-name`, `aria-progressbar-name`, `page-has-heading-one`, `list` e `image-alt` su nessuna pagina misurata. Baseline da 71 a 47 voci, solo rimozioni. Schermate prima/dopo (profilo giocatore, notifiche, profilo con traguardi, `/admin/utenti`): nessun cambio visivo, salvo le due icone del ruolo suggerito un po' più distanziate.

### Rimasto fuori / da sapere

- `target-size` ancora in baseline, fuori dal perimetro del ticket: i link "contatti" nel testo della home, il link "nuovo" in `/admin/utenti`, un link nel dettaglio partita su mobile e le icone piccole (`Modifica`, `Cancella risultato`) delle card di `/admin/allenamenti`, che UX-13 ridisegna.
- `heading-order` (moderate) resta su quasi tutte le pagine: come da ticket rientra in UX-10.
- Effetto collaterale di `npm run a11y`: visitare `/notifiche` segna tutte le notifiche come lette, quindi lo script lo fa per l'atleta di prova nel DB di sviluppo.
