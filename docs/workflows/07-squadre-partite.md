# Squadre agonistiche e partite

## Stagioni

Una stagione è identificata da una stringa `YYYY-YY` (es. `"2025-26"`).

Calcolo della stagione corrente (usato ovunque nell'app):
```typescript
const year = new Date().getFullYear();
const start = new Date().getMonth() >= 8 ? year : year - 1; // agosto = inizio stagione
const currentSeason = `${start}-${String(start + 1).slice(-2)}`;
```

Il modello `Season` tiene traccia delle stagioni con un flag `isCurrent`. La stagione corrente è ottenuta via `GET /api/competitive-teams/seasons/current`.

## `CompetitiveTeam`

Una squadra agonistica appartiene a una stagione e può avere:
- `color` (hex) — usato nei badge e UI
- `championship` — es. "Gold Ovest", "Silver Est"
- `memberships` → `TeamMembership[]`

### Membership

```prisma
TeamMembership {
  teamId    String
  userId    String?    // atleta con account
  childId   String?    // atleta senza account (figlio)
  isCaptain Boolean
}
```

Esattamente uno tra `userId` e `childId` deve essere non-null.

L'aggiunta di membri è gestita da `AdminSquadreClient`:
- Il selettore mostra utenti e figli non ancora nella squadra
- Gli utenti appaiono con prefisso `u:id`, i figli con `c:id`
- Il backend riceve `{ userId }` o `{ childId }` e crea la `TeamMembership`

## `Match` (tabella: `OfficialMatch`)

| Campo | Significato |
|-------|-------------|
| `teamId` | La nostra squadra agonistica |
| `opponentId` | Squadra avversaria (`OpposingTeam`) |
| `isHome` | Casa (true) o trasferta |
| `matchType` | `LEAGUE` / `TOURNAMENT` / `FRIENDLY` |
| `ourScore` / `theirScore` | Risultato |
| `result` | `WIN` / `LOSS` / `DRAW` (calcolato/inserito dall'admin) |

### Workflow risultato

1. Admin va in `/admin/partite`
2. Apre il dialog di modifica e inserisce punteggi + risultato
3. `PUT /api/matches/[matchId]`
4. Se `result` viene impostato per la **prima volta** (era `null`): invia push + in-app `MATCH_RESULT`

Il filtro per stagione del form partita: `AdminPartiteClient` e `CalendarClient` usano `seasonForDate(dateStr)` per mostrare solo le squadre della stagione corrispondente alla data della partita.

## `PlayerMatchStats`

Statistiche individuali per partita (punti, canestri, falli, minuti). Collegate a `User` o `Child`.

Gestite tramite `POST/PATCH /api/matches/[matchId]/stats`.

## Badge squadra

In tutta l'app, l'appartenenza alla stagione corrente viene mostrata come badge colorato:
- Nella `RegistrationForm` (accanto al nome dell'utente/figlio)
- Nel `ParentChildLinker` (profilo genitore)
- Nel profilo giocatore `/giocatori/[slug]`
- Nei tabelloni degli allenamenti (`RosterByRole`)

Filtro stagione corrente su `teamMemberships`:
```typescript
.filter((m) => m.team.season === currentSeason)
```

## Squadre agonistiche come restrizione allenamento

Un `TrainingSession` può avere `restrictTeamId` — solo i membri di quella squadra possono iscriversi. Usato per allenamenti specifici di una squadra (es. solo la squadra Gold).

Il campo `openRoles` permette eccezioni: i ruoli sportivi elencati bypassano la restrizione di squadra (es. R1 sempre ammessi perché il Baskin richiede almeno un R1 per squadra).
