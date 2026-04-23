# Generazione squadre

## Principio: determinismo con seed

La generazione è **deterministica**: dato lo stesso `sessionId`, produce sempre le stesse squadre. Questo è intenzionale — evita che un admin rigeneri e ottenga ogni volta squadre diverse.

L'algoritmo usa **Mulberry32**, un PRNG (pseudo-random number generator) seedato con l'hash dell'`id` dell'allenamento.

```typescript
// src/lib/teamGenerator.ts
generateTeams(registrations, sessionId, numTeams: 2 | 3)
```

## Algoritmo

1. **Seed**: hash numerica del `sessionId` (stringa CUID → numero tramite operazioni bit a bit)
2. **Shuffle deterministico**: Fisher-Yates con Mulberry32 seedato
3. **Bilanciamento per ruolo**: gli atleti vengono distribuiti cercando di bilanciare i ruoli sportivi tra le squadre
4. **Esclusione allenatori**: le registrazioni con `registeredAsCoach = true` sono escluse prima della generazione (filtrate nel client che passa `registrationIds`)

## Struttura dati squadre (JSON salvato in `TrainingSession.teams`)

```json
{
  "teamA": [{ "id": "reg_id", "name": "Mario Rossi", "role": 3 }, ...],
  "teamB": [{ "id": "reg_id", "name": "Luigi Bianchi", "role": 1 }, ...],
  "teamC": [{ "id": "reg_id", "name": "Anna Verdi", "role": 2 }, ...],
  "generated": true
}
```

`teamC` è presente solo se `numTeams === 3`.

## Nomi squadre in UI

| Chiave | Nome | Colore |
|--------|------|--------|
| `teamA` | Arancioni | `#E65100` |
| `teamB` | Neri | `#1A1A1A` |
| `teamC` | Bianchi | `#757575` |

## Trigger

`POST /api/teams/[sessionId]` — solo COACH/ADMIN.

Body: `{ "numTeams": 2 }` o `{ "numTeams": 3 }`.

Al completamento:
1. Salva il JSON in `TrainingSession.teams`
2. Invia push solo agli **utenti iscritti come atleti** con `notifPrefs.push.TEAMS_READY = true`
3. Crea in-app notification `TEAMS_READY` (globale, filtrata dalle preferenze in-app dell'utente)

## Reset squadre

Le squadre vengono azzerate (`teams = Prisma.DbNull`) automaticamente in tre casi:
- Un atleta si disiscrivi (`DELETE /api/registrations/[id]`)
- Un figlio viene eliminato (CASCADE in `DELETE /api/children/[childId]`)
- L'admin clicca "Azzera squadre" (`DELETE /api/teams/[sessionId]`)

## Componente `TeamDisplay`

Client Component controllato — non fa fetch internamente. Riceve da `page.tsx`:
- `teams: TeamsData | null`
- `teamsLoading: boolean`
- `onTeamsGenerated: (teams) => void`

Questo permette alla pagina di mantenere lo stato in un unico posto e aggiornarlo in tempo reale senza rimontare il componente.
