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

Il genitore usa `ParentChildLinker` → `ChildAddDialog` (`useAddChildFlow`). Due strade, e **una scheda `Child` nasce solo quando serve**:

- **Il figlio non ha un account** ("Crea manualmente"): nome, genere, data di nascita → `POST /api/users/me/children` crea `Child` + `ChildGuardian`. Prima di creare, il dialog cerca un account con lo stesso nome e, se c'è, lo propone ("C'è già un profilo con questo nome"): il genitore può comunque proseguire (omonimi).
- **Il figlio ha già un account** (ricerca per email o nome): `POST /api/link-requests { targetUserId }` crea **solo** la `LinkRequest`, con `childId` null. Nessuna scheda figlio finché il figlio non accetta.

Nella lista, un figlio condiviso mostra "Gestito anche da …" (`otherGuardians`, solo nomi: l'email dell'altro genitore non viene esposta). Le richieste senza risposta compaiono come righe "In attesa di conferma" con "Annulla richiesta" (`DELETE /api/link-requests/[id]`); la pagina le carica dal server (`pendingLinks`), così restano dopo un ricaricamento.

> **Perché così:** fino a ottobre 2026 "Sì, è il profilo giusto" creava subito una scheda `Child` vuota e poi, con una seconda chiamata, la richiesta. La scheda restava come doppione "senza account" (in profilo e nelle liste dello staff) finché il figlio non accettava, e per sempre se rifiutava o se la seconda chiamata falliva.

## Collegamento figlio → account (`LinkRequest`)

`LinkRequest.childId` è facoltativo e distingue due casi:

- **`childId` null**: il genitore aggiunge un figlio che ha già un account (`POST /api/link-requests`). All'accettazione nasce la scheda `Child` legata all'account: dati dal profilo, genitore come primo tutore, **senza slug**, `parentalConsentAt` = data della richiesta. È lo stesso stato di `link-account` dello staff.
- **`childId` valorizzato**: una scheda creata a mano esiste già e il figlio si è fatto un account dopo (dialog "Collega account", `PATCH /api/children/[id]` con `linkEmail`/`linkUserId`). All'accettazione `Child.userId` = id del figlio.

In entrambi i casi:

1. Il figlio riceve una notifica `LINK_REQUEST` (push + in-app) e risponde da `/profilo#richieste` → `POST /api/link-requests/[id]/respond`
2. Se accetta e il suo account è GUEST diventa ATHLETE; il ruolo Baskin non viene copiato
3. Notifica `LINK_RESPONSE` al genitore
4. Se l'account ha già una scheda figlio (un altro genitore): 409, il secondo genitore lo collega lo staff

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
