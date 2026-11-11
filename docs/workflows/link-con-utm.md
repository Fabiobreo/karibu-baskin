# Link con UTM — quali link usare fuori dal sito

Per sapere da dove arriva chi chiede di provare (UX-55), i link che il club mette fuori dal sito portano due o tre parametri: **da dove** (`utm_source`), **in che forma** (`utm_medium`) e, se serve, **per quale iniziativa** (`utm_campaign`). Senza, tutte le visite risultano "dirette" e non si distinguono.

Chi apre il sito da uno di questi link e poi scrive dal modulo contatti fa arrivare allo staff un'email con la riga **"Arrivato da: instagram, bio"**. Non c'è nessun tracciamento della persona: il sito ricorda solo la provenienza del link, per 30 giorni, in un cookie tecnico (`karibu-ref`, citato nell'informativa privacy).

## Link pronti da copiare

I link qui sotto usano l'indirizzo attuale del sito, `https://karibu-baskin.vercel.app`. Se il sito passa a un dominio proprio, si cambia solo la prima parte.

| Dove                                            | Link                                                                                               |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Bio di Instagram                                | `https://karibu-baskin.vercel.app/contatti?utm_source=instagram&utm_medium=bio#vieni-a-provare`    |
| Pagina Facebook (link nelle informazioni)       | `https://karibu-baskin.vercel.app/contatti?utm_source=facebook&utm_medium=bio#vieni-a-provare`     |
| Volantino stampato (testo o QR)                 | `https://karibu-baskin.vercel.app/contatti?utm_source=volantino&utm_medium=print#vieni-a-provare`  |
| QR su manifesti, striscioni, bordo campo        | `https://karibu-baskin.vercel.app/contatti?utm_source=qr&utm_medium=print#vieni-a-provare`         |
| Messaggio al Comune, alle scuole, ad altri siti | `https://karibu-baskin.vercel.app/contatti?utm_source=partner&utm_medium=referral#vieni-a-provare` |
| Messaggio WhatsApp ai genitori di altre società | `https://karibu-baskin.vercel.app/contatti?utm_source=whatsapp&utm_medium=share#vieni-a-provare`   |
| Email (newsletter di altri, firme)              | `https://karibu-baskin.vercel.app/contatti?utm_source=email&utm_medium=share#vieni-a-provare`      |

Per un'iniziativa precisa si aggiunge la campagna, sempre minuscola e con i trattini, per esempio l'open day:

```
https://karibu-baskin.vercel.app/contatti?utm_source=volantino&utm_medium=print&utm_campaign=open-day-2027#vieni-a-provare
```

## Le regole

- **Fonti ammesse** (`utm_source`): `whatsapp`, `instagram`, `facebook`, `email`, `volantino`, `qr`, `partner`.
- **Mezzi ammessi** (`utm_medium`): `share` (condivisione), `bio` (link nella bio), `print` (carta), `referral` (siti di altri).
- **Campagna** (`utm_campaign`): libera, ma minuscola con trattini (`open-day-2027`, `5x1000-2027`).
- Mai inventare varianti (`WhatsApp`, `wa`, `insta`): un valore scritto in due modi diventa due canali diversi.
- L'ancora `#vieni-a-provare` sta sempre **in fondo**, dopo i parametri.

Nel codice i link si costruiscono con `withUtm(path, { source, medium, campaign })` di `@/lib/utm`, che conosce gli stessi valori: un valore fuori elenco non compila.

## Dove si leggono

- **Email del modulo contatti:** la riga "Arrivato da". È la lettura che conta.
- **Vercel Analytics:** da verificare se il piano attuale mostra i parametri UTM nel pannello. Se non li mostra, resta l'email; i parametri non fanno danni e servono il giorno che si cambia piano.
