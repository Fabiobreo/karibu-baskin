# Genitore, figli e iscrizioni anonime

## Modello `Child`

Un `Child` rappresenta un atleta senza account Google (tipicamente un minore). È gestito da un genitore (`PARENT`).

```prisma
Child {
  parentId  String     // User.id del genitore
  name      String
  sportRole Int?
  userId    String?    // se il figlio crea un account in futuro
}
```

Un figlio può:
- Essere iscritto dal genitore tramite `childId` nella Registration
- Avere statistiche partita (`PlayerMatchStats`)
- Essere membro di una squadra agonistica (`TeamMembership`)
- Successivamente creare un account proprio e collegarsi

## Aggiunta figli (in `/profilo`)

Il genitore usa il componente `ParentChildLinker`:
1. Inserisce nome, ruolo, genere, data nascita del figlio
2. `POST /api/users/me/children` → crea riga `Child`

## Collegamento figlio → account (`LinkRequest`)

Quando un figlio crea un account Google in futuro, si può collegare al `Child` esistente:

1. Il genitore trova l'utente del figlio e invia una `LinkRequest` (`POST /api/link-requests`)
2. Il figlio riceve una notifica `LINK_REQUEST` (push + in-app)
3. Il figlio accetta o rifiuta → `PATCH /api/link-requests/[id]`
4. Se accettato: `Child.userId` = id del figlio, `User.appRole` rimane invariato
5. Notifica `LINK_RESPONSE` inviata al genitore

Dopo il collegamento, le iscrizioni future tramite `childId` saranno riconosciute anche quando il figlio usa il proprio account (controllo incrociato in `RosterByRole` e `RegistrationForm`).

## Iscrizioni anonime e rivendicazione

### Il problema

Un atleta si iscrive a un allenamento senza avere un account ("iscrizione anonima" con solo nome + email opzionale). Successivamente crea un account — quelle iscrizioni passate non sono collegate al suo profilo.

### Flusso di rivendicazione automatica

Al login (ogni visita di `/profilo`), il server confronta `user.name` con i nomi delle iscrizioni anonime (case-insensitive):

```typescript
// src/app/profilo/page.tsx
const anonymousMatches = await prisma.registration.findMany({
  where: { userId: null, childId: null, name: { equals: user.name.trim(), mode: "insensitive" } }
});
```

Se ci sono corrispondenze, viene mostrata la card `ClaimAnonymousCard`:

> *"Abbiamo trovato X iscrizioni con il tuo nome. Eri tu?"*
> **[Sì, ero io]** → `POST /api/registrations/claim` → `updateMany({ data: { userId: user.id } })`
> **[No, non ero io]** → dismiss locale (nessuna modifica al DB)

### Gestione admin iscrizioni anonime

Nel pannello admin (`AdminAnonymousRegistrations`):
- Le iscrizioni anonime sono raggruppate per nome (case-insensitive)
- Ogni gruppo mostra le sessioni frequentate come chip cliccabili
- Si può **modificare** nome, email, ruolo di un gruppo (aggiorna tutte le iscrizioni del gruppo)
- Si può **eliminare** un gruppo → cancella tutte le registrazioni + azzera `teams` degli allenamenti coinvolti
- Ricerca per nome/email, paginazione

## Eliminazione figlio (caso speciale)

`DELETE /api/children/[childId]` esegue un cascade **manuale** perché `Registration.child` ha `onDelete: SetNull` (non Cascade):

1. Trova le registrazioni del figlio + i `sessionId` coinvolti
2. Cancella le registrazioni
3. Azzera `teams` degli allenamenti coinvolti (`Prisma.DbNull`)
4. Elimina il figlio (cascade automatico su `TeamMembership`)

Perché `SetNull` invece di `Cascade`? Perché una `Registration` potrebbe essere stata fatta prima che il figlio venisse eliminato e si vuole preservare la storia (solo il collegamento viene rimosso).
