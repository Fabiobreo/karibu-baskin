# Flusso iscrizioni

## Tre tipologie

```
POST /api/registrations
       │
       ├─ childId presente → iscrizione figlio (genitore loggato)
       ├─ userId presente  → iscrizione utente loggato
       └─ nessuno dei due → iscrizione anonima
```

## Modello `Registration`

| Campo | Significato |
|-------|-------------|
| `userId` | Utente con account (null se figlio o anonimo) |
| `childId` | Figlio senza account (null se utente o anonimo) |
| `role` | Ruolo sportivo usato (1–5) |
| `name` | Nome visualizzato nel tabellone |
| `note` | Comunicazione libera (es. "Devo uscire alle 11") |
| `anonymousEmail` | Email opzionale per iscrizioni anonime |
| `registeredAsCoach` | `true` se il COACH si iscrive come allenatore (non atleta) |

Vincoli DB:
- `@@unique([sessionId, userId])` — un utente max una iscrizione per allenamento
- `@@unique([sessionId, childId])` — un figlio max una iscrizione per allenamento

## Iscrizione figlio

1. Il genitore (PARENT) seleziona un figlio nel `RegistrationForm`
2. Vengono controllate le restrizioni usando `appRole = "ATHLETE"` del figlio
3. Il ruolo effettivo è `child.sportRole ?? role_scelto_form`
4. Se il figlio non ha ancora un ruolo: viene salvato `child.sportRole` e `child.sportRoleVariant`

## Iscrizione utente loggato

1. Ruolo effettivo: `user.sportRole ?? role_scelto_form`
2. Se l'utente non ha un ruolo: viene salvato `sportRoleSuggested` (in attesa di conferma admin)
3. Se l'utente ha un account Child collegato (`child.userId`): si controlla che il figlio non sia già iscritto come child per evitare duplicati

## Iscrizione anonima (legacy)

- Nome obbligatorio, email opzionale
- Bypass del controllo squadra ma soggetta a `allowedRoles`
- Raggruppabili per nome nel pannello admin (→ vedi 06-genitore-figlio.md)

## Restrizioni (`registrationRestrictions.ts`)

La logica è condivisa tra server (API) e client (RegistrationForm) per coerenza.

```
checkRegistrationAllowed(restrictions, appRole, sportRole, isInRestrictedTeam, registeredAsCoach)
```

| Caso | Risultato |
|------|-----------|
| `appRole === "ADMIN"` | sempre ammesso |
| `registeredAsCoach === true` | sempre ammesso (COACH come allenatore) |
| `appRole === "GUEST"` | sempre ammesso (bypass squadra, solo `allowedRoles`) |
| Nessuna restrizione | ammesso |
| `allowedRoles` non vuoto e `sportRole` non incluso | bloccato |
| `restrictTeamId` impostato e `sportRole` in `openRoles` | ammesso |
| `restrictTeamId` impostato e non membro squadra | bloccato |

### Campi di restrizione su `TrainingSession`

```
allowedRoles  []    → ruoli sportivi ammessi (vuoto = tutti)
restrictTeamId null → restringe ai membri di questa squadra agonistica
openRoles     []    → ruoli esenti dalla restrizione di squadra
```

Esempio: allenamento per R4/R5 della squadra Gold, ma R1 sempre ammessi:
```
allowedRoles  = [4, 5, 1]
restrictTeamId = "id-squadra-gold"
openRoles     = [1]
```

## Modalità COACH

Un COACH può iscriversi in due modi:

- **Come atleta**: passa per i normali controlli di restrizione, sceglie il ruolo sportivo
- **Come allenatore** (`registeredAsCoach: true`): bypass totale, appare nella sezione "Allenatori presenti" nel tabellone anziché tra gli atleti, **non** viene incluso nella generazione squadre

Il toggle è visibile solo agli utenti con `appRole === "COACH"` nel `RegistrationForm`.

## Disiscrizione

`DELETE /api/registrations/[registrationId]`

Chi può disiscrivere:
- Sé stessi (proprio `userId`)
- Il proprio figlio (genitore)
- Qualsiasi iscritto (COACH/ADMIN)

La disiscrizione **azzera le squadre generate** (`teams = Prisma.DbNull`) per l'allenamento coinvolto — le squadre diventano obsolete se cambia la lista iscritti.

## Rilevamento squadre obsolete

Il client (`/allenamento/[session]`) confronta il Set degli ID delle registrazioni correnti con gli ID nei JSON delle squadre. Se differiscono (qualcuno uscito o entrato), mostra un banner "Rigenera squadre".
