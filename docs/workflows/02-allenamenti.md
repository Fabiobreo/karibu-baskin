# Ciclo di vita di un allenamento

## Panoramica

```
Admin crea allenamento
       ↓
Push + in-app "Nuovo allenamento" → tutti
       ↓
Utenti si iscrivono (→ vedi 03-iscrizioni.md)
       ↓
Admin genera squadre
       ↓
Push "Squadre pronte" → solo iscritti
       ↓
Allenamento termina (iscrizioni chiuse automaticamente)
```

## Struttura dati: `TrainingSession`

| Campo | Tipo | Significato |
|-------|------|-------------|
| `id` | CUID | Identificatore primario |
| `dateSlug` | `String?` unique | URL leggibile es. `"2025-03-15T18:00"` |
| `date` | `DateTime` | Inizio allenamento |
| `endTime` | `DateTime?` | Fine (se null, si assume +2h da `date`) |
| `teams` | `Json?` | Squadre generate (`{ teamA, teamB, teamC?, generated }`) |
| `allowedRoles` | `Int[]` | Ruoli sportivi ammessi (vuoto = tutti) |
| `restrictTeamId` | `String?` | Restringe ai membri di questa squadra agonistica |
| `openRoles` | `Int[]` | Ruoli esenti dalla restrizione di squadra |

## Creazione (solo COACH/ADMIN)

`POST /api/sessions` — payload:
```json
{
  "title": "Allenamento martedì",
  "date": "2025-04-15T18:00:00.000Z",
  "endTime": "2025-04-15T20:00:00.000Z",
  "dateSlug": "2025-04-15T18:00",
  "allowedRoles": [],
  "restrictTeamId": null,
  "openRoles": []
}
```

Il `dateSlug` viene generato automaticamente dal client (`SessionRestrictionEditor`) nel formato `YYYY-MM-DDTHH:mm`. È `@unique` — se già esiste, la creazione fallisce con errore Prisma P2002.

Dopo la creazione vengono triggerate (fire-and-forget):
- Push a tutti gli iscritti con `notifPrefs.push.NEW_TRAINING = true`
- In-app notification di tipo `NEW_TRAINING`

## URL di accesso

Gli allenamenti sono accessibili tramite:
- `/allenamento/[dateSlug]` — URL canonico leggibile
- `/allenamento/[cuid]` — retrocompatibilità

Il server risolve entrambi: `GET /api/sessions/[session]` cerca prima per `dateSlug`, poi per `id`.

## Scadenza iscrizioni

Le iscrizioni sono chiuse quando `now > endTime` (o `now > date + 2h` se `endTime` è null). La verifica avviene sia server-side (API `POST /api/registrations`) sia client-side (il form mostra "Allenamento terminato").

## Modifica e cancellazione

`PATCH /api/sessions/[sessionId]` e `DELETE /api/sessions/[sessionId]` — solo COACH/ADMIN.

La cancellazione di un allenamento cancella in cascata tutte le `Registration` collegate (`onDelete: Cascade`).

## Pagina allenamento (`/allenamento/[session]`)

Client Component (`"use client"`) con polling ogni 30 secondi. Struttura:

- **Utente iscritto + squadre generate**: banner "La tua squadra" → `TeamDisplay` → `RosterByRole`
- **Altrimenti**: `RegistrationForm` → `RosterByRole` → `TeamDisplay`

Il `TeamDisplay` riceve `registrationIds` con i soli atleti (esclusi `registeredAsCoach`) per non includerli nel conteggio delle squadre.
