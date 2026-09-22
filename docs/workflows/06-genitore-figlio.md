# Genitore, figli e iscrizioni anonime

## Modello `Child`

Un `Child` rappresenta un atleta senza account Google (tipicamente un minore). È gestito da **uno o più genitori**, tutti con gli stessi poteri (iscriverlo, disponibilità, RSVP, notifiche, modifica).

```prisma
Child {
  name      String
  sportRole Int?
  userId    String?          // se il figlio crea un account in futuro
  guardians ChildGuardian[]  // i genitori (almeno uno)
}

ChildGuardian {            // chiave: (childId, userId)
  childId   String
  userId    String         // User.id del genitore
  createdAt DateTime       // il più vecchio è chi l'ha registrato
}
```

Ogni controllo "è il genitore di questo figlio?" passa da `@/lib/guardians`: `guardianOf(userId)` (filtro Prisma), `isGuardian(userId, childId)`, `GUARDIANS_SELECT` + `guardianList`/`guardianNames` per mostrarli. Mai confrontare un singolo campo: il modello a genitore unico (`Child.parentId`) è stato migrato in `ChildGuardian` a settembre 2026.

### Secondo genitore

Lo collega solo lo staff, per ora:

- **`/admin/utenti/nuovo-figlio`**: scelto il genitore, mentre si scrive il nome del figlio compaiono i figli già registrati con un nome simile (`ExistingChildMatches`, `GET /api/admin/people?kind=child`); "Collega" li aggiunge a quel genitore invece di creare un doppione.
- **Scheda del figlio in `/admin/utenti`** (sezione Genitori, `ChildGuardiansSection`): aggiungi o scollega un genitore.
- **Figlio con un proprio account** (es. un atleta figlio di un tesserato): la stessa ricerca propone anche gli utenti che non hanno ancora una scheda figlio. "Collega" crea la scheda legata all'account (`POST /api/admin/children/link-account`: nome, ruolo, genere e data di nascita dal profilo, **senza slug** così la persona non compare due volte in ricerca pubblica) con il genitore come primo tutore. È lo stesso stato di una `LinkRequest` accettata. Le schede legate a un account non compaiono tra i candidati della rosa (`/admin/squadre/[teamId]/rosa`): lì la persona si aggiunge come utente.
- API: `POST` / `DELETE /api/admin/children/[childId]/guardians`. L'ultimo genitore non si scollega (si elimina il figlio).

### Eliminazione

- Dal profilo, con altri genitori collegati, "elimina" toglie solo il proprio collegamento (`DELETE /api/children/[id]` → `{ unlinked: true }`): il figlio resta agli altri con iscrizioni e statistiche.
- Lo staff elimina per tutti con `?all=1` (pannello admin).
- Eliminando un utente, i figli di cui era l'unico genitore vengono eliminati con lui (`deleteUserAndOrphanedChildren`); quelli condivisi restano all'altro genitore.

Un figlio può:

- Essere iscritto dal genitore tramite `childId` nella Registration
- Avere statistiche partita (`PlayerMatchStats`)
- Essere membro di una squadra agonistica (`TeamMembership`)
- Successivamente creare un account proprio e collegarsi

## Aggiunta figli (in `/profilo`)

Il genitore usa il componente `ParentChildLinker`:

1. Inserisce nome, ruolo, genere, data nascita del figlio
2. `POST /api/users/me/children` → crea riga `Child` e il collegamento `ChildGuardian`

Nella lista, un figlio condiviso mostra "Gestito anche da …" (`otherGuardians`, solo nomi: l'email dell'altro genitore non viene esposta).

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
  where: { userId: null, childId: null, name: { equals: user.name.trim(), mode: "insensitive" } },
});
```

Se ci sono corrispondenze, viene mostrata la card `ClaimAnonymousCard`:

> _"Abbiamo trovato X iscrizioni con il tuo nome. Eri tu?"_
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
