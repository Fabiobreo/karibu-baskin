# UX-40 · Admin: header ridotto, tab, azioni fuori dalle righe, linguaggio, target

**Ondata:** 4 · **Stima:** L (PR separate per punto) · **Dipende da:** UX-32 · **Stato:** da fare

## Problema

Era parcheggiato ("shell admin separata: per ora basta togliere il sito pubblico dall'admin"). UX-06 ha tolto nastro e footer, ma:

1. **Due barre.** Sopra la barra admin (`AdminNavBar`) resta l'header pubblico completo (9 voci, ricerca, Aspetto, lingua, notifiche). Su mobile resta la barra in basso pubblica (Home, Allenamenti, Calendario, Notifiche).
2. **Tab con frecce a 1.440 px.** `AdminTrainingsView.tsx:73` (`variant="scrollable" scrollButtons="auto"`) mostra ‹ › con sole 3 schede, e lo stesso capita a `AdminNavBar` in alcune pagine.
3. **Azioni rischiose in riga** in `/admin/utenti` (`AdminUserList`):
   - una tendina del ruolo attiva su ognuna delle 116 righe, senza annulla;
   - un cestino rosso su ogni riga.
4. **Icone senza etichetta.** In `/admin/partite` ogni riga ha 5 icone (convocati, statistiche, MVP, modifica) più il cestino.
5. **Gergo.**
   - Convocazioni (`ConvocazioniClient`, `LineupOptimizerSection`): "Σμ 160.3", "μ 26.2", "40 formazioni valide", "Presenze calcolate sulle ultime 2 settimane (nessun allenamento gestito in finestra)".
   - Utenti: colonna "Skill" con "26.2 ±6.1".
6. **Intestazioni diverse:** "Gestione Partite" (h1 grande), "CONVOCAZIONI" (occhiello + h4), "Statistiche giocatori" (icona appesa); le convocazioni partono 24 px più a destra delle altre pagine.
7. **Target su mobile:** ancora 87 sotto 44 px in `/admin/partite` e 63 in `/admin/utenti` (rimisura del 29/09).
8. **Troncamenti:** in "Partite imminenti" della dashboard mobile il nome della partita diventa "Kari…".

## Cosa fare

1. **Header admin ridotto:** logo, "Admin", link "Torna al sito", avatar. Niente menu pubblico, niente barra in basso pubblica: su mobile la navigazione admin è la barra admin (o un menu).
2. **Tab:** `scrollButtons` solo sotto `sm` (`allowScrollButtonsMobile` e `scrollButtons={isMobile ? "auto" : false}`), in `AdminTrainingsView` e `AdminNavBar`.
3. **`/admin/utenti`:**
   - ruolo mostrato come chip e modificabile solo nella scheda utente (o con un'azione esplicita "Cambia ruolo" con conferma e annulla);
   - eliminazione in un menu "⋯" per riga, con conferma.
4. **`/admin/partite`:** azioni principali con etichetta ("Convoca", "Statistiche") su desktop; le altre nel menu "⋯". Su mobile un menu con etichette.
5. **Linguaggio staff:**
   - μ e σ tradotti in "Livello stimato" (barra o scala 1-5) e "affidabilità";
   - somma della formazione come "Forza complessiva";
   - frase delle presenze riscritta senza "finestra".
   - Restano visibili solo a COACH e ADMIN, come oggi.
6. **Intestazioni:** ~~`AdminPageHeader` anche in convocazioni e statistiche~~ fatto in UX-32 (`PageHeader`); resta lo stesso contenitore delle altre pagine admin.
7. **Target** a 44 px su mobile per icone e link nelle righe di partite e utenti.
8. **Troncamenti:** nome partita su due righe nelle card della dashboard mobile.

## Criteri di accettazione

- In admin un solo livello di navigazione per dispositivo.
- Nessuna freccia di scorrimento sulle tab a 1.440 px.
- Nessuna azione distruttiva o di cambio ruolo direttamente nella riga della lista.
- Nessun "μ", "σ" o "Σ" visibile in UI.
- Rimisura: target sotto 44 px su mobile sotto 10 in `/admin/partite` e `/admin/utenti`.
- `npm run a11y` verde.
