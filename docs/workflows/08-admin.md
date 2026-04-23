# Pannello Admin

Accessibile da `/admin` — richiede `appRole >= COACH`.

## Struttura route

```
/admin/login                  → Login Google (redirect se già loggati)
/admin/                       → Dashboard (ultimi iscritti, iscrizioni anonime)
/admin/allenamenti            → Gestione allenamenti + restrizioni
/admin/partite                → Gestione partite ufficiali
/admin/eventi                 → Gestione eventi generici (tornei, trasferte)
/admin/squadre                → Gestione squadre agonistiche e roster
/admin/utenti                 → Gestione utenti
/admin/utenti/nuovo           → Crea utente manualmente
```

Il layout `/admin/(dashboard)/layout.tsx` verifica che l'utente sia almeno COACH — reindirizza altrimenti.

## Gestione utenti (`/admin/utenti`)

Componente: `AdminUserList`

Funzionalità:
- Ricerca per nome/email
- Filtri: ruolo app (chip toggle), ruolo Baskin (select), genere (toggle group)
- Ordinamento per nome, ruolo, data iscrizione, n° allenamenti (`TableSortLabel`)
- Paginazione (10/25/50/100, default 25)
- Modifica ruolo app e ruolo sportivo direttamente dalla tabella
- Eliminazione utente (solo ADMIN, non sé stessi): `DELETE /api/users/[userId]`

### Promozione ruolo sportivo

Quando un utente ha `sportRoleSuggested` (autovalutazione in attesa), l'admin vede il badge "Suggerito" e può confermarlo → salva `sportRole` e logga in `SportRoleHistory`.

## Gestione allenamenti (`/admin/allenamenti`)

Componente: `AdminSessionEditor` (nel calendario e nella pagina dedicata)

Il form di creazione/modifica include `SessionRestrictionEditor` per impostare:
- Ruoli ammessi (`allowedRoles`)
- Squadra ristretta (`restrictTeamId`)
- Ruoli aperti (`openRoles`)

La generazione squadre avviene nella pagina pubblica `/allenamento/[session]` — è intenzionale (l'admin usa la stessa pagina degli atleti).

## Gestione partite (`/admin/partite`)

Componente: `AdminPartiteClient`

- Il selettore squadra mostra **solo le squadre della stagione corrente** (calcolata dalla data della partita)
- Dopo salvataggio: lo stato locale viene aggiornato direttamente (non re-fetch) preservando `_count` dall'entry precedente
- Apertura automatica dialog di modifica: legge `?edit=[id]` da URL → apre il dialog → pulisce l'URL

## Gestione squadre agonistiche (`/admin/squadre`)

Componente: `AdminSquadreClient`

- Aggiunta membri: dropdown con utenti E figli non ancora nella squadra
  - Utenti: prefisso interno `u:userId`
  - Figli: prefisso interno `c:childId` + chip "Figlio" nel MenuItem
- Rimozione membro: `DELETE /api/competitive-teams/[id]/members`
- Capitano: toggle `isCaptain`

## Iscrizioni anonime (dashboard)

Componente: `AdminAnonymousRegistrations`

Le iscrizioni senza `userId` e `childId` sono raggruppate per nome (case-insensitive) nel pannello admin. Ogni gruppo mostra le sessioni come chip con data cliccabili.

Azioni su un gruppo:
- **Modifica**: cambia nome, email, ruolo Baskin per tutte le iscrizioni del gruppo
- **Elimina**: cancella tutte le iscrizioni + azzera squadre degli allenamenti coinvolti

Icona: `WarningIcon` con sfondo giallo per chi non ha email.

## Calendario admin (`/calendario`)

Il `CalendarClient` ha comportamento differenziato per staff:
- Click su giorno senza eventi → dialog per creare allenamento o evento
- Click su evento → `EventDetailDialog` con icona matita → link a `/admin/partite?edit=[id]` o `/admin/eventi?edit=[id]`

Quando si arriva a `/admin/partite?edit=[id]` il componente legge `useSearchParams()` al mount, apre il dialog di modifica e poi pulisce l'URL.

## Principi di sicurezza nelle API

| Endpoint | Protezione |
|----------|------------|
| `POST/PATCH/DELETE /api/sessions` | `isCoachOrAdmin()` |
| `POST /api/teams/[sessionId]` | `isCoachOrAdmin()` |
| `PUT/DELETE /api/matches/[matchId]` | `isAdminUser()` |
| `PATCH /api/users/[userId]` | `isAdminUser()` |
| `DELETE /api/users/[userId]` | `isAdminUser()` (non sé stessi) |
| `PATCH/DELETE /api/registrations` (bulk) | `isCoachOrAdmin()` |

`isCoachOrAdmin()` e `isAdminUser()` sono definiti in `src/lib/apiAuth.ts` e usano `auth()` di Auth.js internamente.
