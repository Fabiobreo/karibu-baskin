# Sistema notifiche

## Due canali indipendenti

```
Evento (es. nuovo allenamento)
       ├─ Push notification  → browser/dispositivo (opt-in per device)
       └─ In-app notification → centro notifiche /notifiche (sempre creata)
```

## Notifiche push

### Architettura

- **Standard**: Web Push API + VAPID (Variable Asymmetric Cryptography Identification)
- **Library**: `web-push` npm package
- **Subscription**: 1 riga `PushSubscription` per device/browser, associata all'`userId` se loggato
- **Invio**: fire-and-forget, le subscription scadute (HTTP 410/404) vengono rimosse automaticamente

### Helper (`src/lib/webpush.ts`)

| Funzione | Quando usarla |
|----------|---------------|
| `sendPushToAll(payload, adminOnly?, notifType?)` | Broadcast (NEW_TRAINING, MATCH_RESULT) |
| `sendPushToUsers(userIds[], payload, notifType?)` | Audience ristretta (TEAMS_READY) |
| `sendPushToUser(userId, payload)` | Utente singolo (LINK_REQUEST/RESPONSE) |

Tutte e tre rispettano le preferenze push dell'utente se `notifType` è specificato.

### Attivazione (UI)

Il componente `NotificationPrefsPanel` in `/profilo`:
1. Chiede il permesso browser (`Notification.requestPermission()`)
2. Ottiene chiave VAPID pubblica da `/api/push/vapid-public-key`
3. Crea subscription con Service Worker (`pushManager.subscribe`)
4. Salva endpoint + chiavi in DB via `POST /api/push/subscribe`

## Notifiche in-app

### Modello

```prisma
AppNotification {
  type        AppNotificationType   // NEW_TRAINING | TEAMS_READY | MATCH_RESULT | SYSTEM | LINK_REQUEST | LINK_RESPONSE
  title       String
  body        String
  url         String?
  targetUserId String?              // null = visibile a tutti; non-null = solo a quell'utente
}

AppNotificationRead {
  notificationId String
  userId         String             // chi ha letto
  readAt         DateTime
}
```

### Visibilità

`GET /api/notifications` restituisce le notifiche visibili all'utente:
- `targetUserId = null` (broadcast) **oppure** `targetUserId = userId` (personale)
- Filtrate per preferenze in-app: i tipi disabilitati dall'utente non compaiono

### Lettura

- Singola: `PATCH /api/notifications/[id]`
- Tutte: `PATCH /api/notifications/read-all`
- Badge non lette: `GET /api/notifications/unread-count`

## Tipi di notifica e destinatari

| Tipo | Trigger | Push | In-app | Audience |
|------|---------|------|--------|----------|
| `NEW_TRAINING` | Creazione allenamento | ✅ tutti (con pref) | ✅ tutti (con pref) | Broadcast |
| `TEAMS_READY` | Generazione squadre | ✅ iscritti (con pref) | ✅ tutti (con pref) | Push: solo iscritti |
| `MATCH_RESULT` | Inserimento risultato partita* | ✅ tutti (con pref) | ✅ tutti (con pref) | Broadcast |
| `SYSTEM` | Nuovo utente registrato | ✅ solo admin | ✅ no (non creata) | Solo admin |
| `LINK_REQUEST` | Richiesta collegamento genitore-figlio | `sendPushToUser` | `targetUserId` | Utente specifico |
| `LINK_RESPONSE` | Risposta alla richiesta | `sendPushToUser` | `targetUserId` | Utente specifico |

*MATCH_RESULT viene inviata solo quando il risultato viene impostato **per la prima volta** (da `null` a non-null).

## Preferenze utente (`notifPrefs`)

Salvate come JSON sul modello `User`:

```json
{
  "push": {
    "NEW_TRAINING": true,
    "TEAMS_READY": false,
    "MATCH_RESULT": true
  },
  "inApp": {
    "NEW_TRAINING": true,
    "TEAMS_READY": true,
    "MATCH_RESULT": false
  }
}
```

- `null` / chiave mancante = tutto abilitato (default)
- API: `GET /api/users/me/notif-prefs`, `PATCH /api/users/me/notif-prefs`
- I tipi `SYSTEM`, `LINK_REQUEST`, `LINK_RESPONSE` non sono configurabili (sempre attivi)
- I tipi configurabili sono definiti in `src/lib/notifPrefs.ts` → `CONTROLLABLE_TYPES`

### Come si applica

**Push**: prima di inviare, per ogni subscription si legge `user.notifPrefs` e si controlla se il tipo è abilitato. Subscription anonime (no userId) ricevono sempre i broadcast.

**In-app**: `GET /api/notifications` filtra con `NOT { type: { in: disabledTypes } }` basandosi sulle preferenze dell'utente richiedente.
