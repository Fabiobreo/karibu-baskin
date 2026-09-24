# UX-03 · Nomi accessibili e struttura dei titoli

**Ondata:** 0 · **Stima:** S · **Dipende da:** nessuno · **Stato:** da fare

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
