# Collegare Instagram al sito Karibu Baskin

La sezione **Gallery** del sito mostra da sola gli ultimi post Instagram del club: ogni mattina alle 6 il sito li scarica e li copia. Per farlo servono due codici da Meta:

- un **token di accesso** (una lunga stringa di lettere e numeri);
- l'**ID dell'account Instagram** (un numero di circa 17 cifre).

Ci vuole circa mezz'ora, da computer (non dal telefono). Il sito legge soltanto: non pubblica, non commenta e non vede i messaggi.

## Cosa serve prima di iniziare

- Le credenziali dell'account Instagram del club.
- Un profilo Facebook personale che sia **amministratore** della Pagina Facebook del club (se la Pagina non c'è, si crea al passo 1).
- Un computer con un browser.

## Passo 1 — Instagram professionale collegato a una Pagina Facebook

1. Nell'app Instagram: **Impostazioni → Tipo di account e strumenti → Passa a un account professionale**, e scegli **Business**. Se è già professionale (Business o Creator), salta questo punto.
2. Collega l'account Instagram alla Pagina Facebook del club: dalla Pagina Facebook, **Impostazioni → Account collegati → Instagram → Collega account**. In alternativa da [Meta Business Suite](https://business.facebook.com), **Impostazioni → Account Instagram**.
3. Controllo: nelle impostazioni della Pagina Facebook deve comparire l'account Instagram del club come collegato.

## Passo 2 — Creare l'app su Meta for Developers

1. Vai su [developers.facebook.com](https://developers.facebook.com) e accedi con il profilo Facebook amministratore della Pagina. La prima volta chiede di registrarsi come sviluppatore: è gratis, basta confermare telefono o email.
2. **Le mie app → Crea app**.
3. Come caso d'uso scegli **Altro**, come tipo **Business**. Nome: per esempio "Karibu Sito Gallery". Email di contatto: quella del club.
4. Nella pagina dell'app aggiungi il prodotto **API Instagram** (o "Instagram Graph API"), nella variante **con accesso tramite Facebook** (non "con accesso Instagram").
5. L'app può restare in **modalità sviluppo**: chi l'ha creata la può usare sui propri account e la revisione di Meta non serve.

Meta cambia spesso nomi e disposizione dei menu: se una voce non c'è esattamente così, cerca quella più simile.

## Passo 3 — Generare il token che non scade e l'ID

1. Apri lo [Strumento di esplorazione API Graph](https://developers.facebook.com/tools/explorer/).
2. In alto a destra, in **App Meta**, scegli l'app appena creata. In **Utente o Pagina** lascia "Token utente".
3. In **Autorizzazioni** aggiungi:
   - `instagram_basic`
   - `pages_show_list`
   - `pages_read_engagement`
   - `business_management` (serve se la Pagina è gestita da Meta Business Suite; non fa danni se non serve)
4. Premi **Generate Access Token**. Nella finestra di Facebook scegli la Pagina del club **e** l'account Instagram del club, poi conferma.
5. **Allunga il token.** Questo token dura un'ora. Copialo, aprilo nel [Debug dei token di accesso](https://developers.facebook.com/tools/debug/accesstoken/), premi **Debug** e poi, in fondo, **Estendi il token di accesso**. Copia il nuovo token, che dura 60 giorni.
6. **Prendi il token della Pagina, che non scade.** Torna nello Strumento di esplorazione, incolla il token da 60 giorni nel campo "Token di accesso" e chiedi:

   ```
   me/accounts
   ```

   Nella risposta trovi la Pagina del club con `"access_token": "…"` e `"id": "…"`. Copia **quel** `access_token`: è il **token da consegnare (codice 1)**. Annota anche l'`id` della Pagina.

7. **Controlla che non scada.** Incolla il token della Pagina nel Debug dei token: alla voce **Scade** deve dire **Mai**. Se dice una data, ripeti il punto 5 (va esteso il token utente prima di chiedere `me/accounts`).
8. **Prendi l'ID dell'account Instagram.** Nello Strumento di esplorazione, sempre con il token della Pagina, chiedi (al posto di `ID_PAGINA` metti l'id annotato al punto 6):

   ```
   ID_PAGINA?fields=instagram_business_account{id,username}
   ```

   La risposta contiene `"instagram_business_account": { "id": "1784…", "username": "…" }`. Controlla che lo username sia quello del club: quell'`id` è il **codice 2**.

9. Prova finale (facoltativa): chiedi `CODICE_2/media?fields=id,caption,permalink`. Se escono gli ultimi post del club, tutto funziona.

## Passo 4 — Consegnare i due codici

- Consegna **codice 1 (token)** e **codice 2 (ID Instagram)** a Fabio.
- Il token è come una password dell'account: **non mandarlo nei gruppi WhatsApp né per email in chiaro**. Meglio un messaggio privato da cancellare dopo, o un password manager condiviso.
- Non cambiare la password Facebook di chi ha generato il token e non togliergli il ruolo di amministratore della Pagina: il token smetterebbe di funzionare e andrebbe rifatto (passo 3).

**Dopo (lo fa Fabio):** inserisce i codici su Vercel come `IG_ACCESS_TOKEN` (codice 1) e `IG_BUSINESS_ACCOUNT_ID` (codice 2), rifà il deploy e preme **Sincronizza** in **Admin → Gallery**. Da lì in poi i post arrivano da soli ogni mattina. I post si possono nascondere uno per uno dalla stessa pagina.

## Se qualcosa non va

| Problema                                              | Cosa fare                                                                                                                                         |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `me/accounts` restituisce una lista vuota             | Il profilo Facebook non è amministratore della Pagina, oppure al punto 4 la Pagina non è stata spuntata: rigenera il token e seleziona la Pagina. |
| Manca `instagram_business_account`                    | L'account Instagram non è professionale o non è collegato alla Pagina: rifai il passo 1.                                                          |
| Errore sui permessi                                   | Manca una delle autorizzazioni del punto 3: aggiungila e rigenera il token.                                                                       |
| Dopo qualche settimana la Gallery non si aggiorna più | Il token non era quello "Scade: Mai", oppure è cambiata la password di Facebook: rifai il passo 3.                                                |
