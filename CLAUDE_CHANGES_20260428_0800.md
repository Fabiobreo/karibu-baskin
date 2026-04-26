# CLAUDE_CHANGES — 2026-04-28 08:00

## Cosa ho fatto e perché

**Bug fix: `openGmDialog` mostra dati obsoleti del girone precedente**

Nel componente `AdminPartiteClient.tsx`, la funzione `openGmDialog` gestisce
l'apertura del dialog "Risultati esterni girone" per un girone specifico.

Il bug era in questa sequenza:

```
1. Admin apre girone A → fetch ok → gmMatches = [3 partite del girone A]
2. Admin chiude il dialog
3. Admin apre girone B → fetch parte...
   → gmLoading = true → spinner visibile
   → fetch completa con ERRORE (es. rete, timeout)
   → gmLoading = false → spinner scompare
   → gmMatches è ancora [3 partite del girone A] ← STALE DATA visibile!
   → nessun messaggio di errore
```

In condizioni normali (fetch ok), il bug era meno visibile perché la risposta
arriva in pochi ms e lo spinner copre la transizione. Ma in caso di fetch fallita:
- I risultati del girone precedente apparivano come fossero del nuovo girone
- Nessun feedback all'admin: sembrava che il girone non avesse risultati, poi
  apparivano 3 partite "false"

**Causa radice:** `setGmMatches([])` non veniva chiamato prima dell'avvio del fetch.
Dopo il fetch, se `res.ok === false` il blocco `if` veniva saltato senza aggiornare
`gmMatches` né impostare un errore.

**Fix applicato:**
1. Aggiunto `setGmMatches([])` immediatamente prima di `setGmLoading(true)`, così
   il dialog parte sempre da uno stato pulito (lo spinner copre il breve "vuoto").
2. Aggiunto `else { setGmError("Errore nel caricamento dei risultati del girone"); }`
   per mostrare un messaggio esplicito se la risposta API non è ok.

## File modificati

| File | Modifica |
|---|---|
| `src/components/AdminPartiteClient.tsx` | `openGmDialog`: aggiunto reset + gestione errore fetch |

### Diff sintetico

```diff
  async function openGmDialog(group: Group) {
    setGmGroup(group);
    setGmError("");
    setEditGm(null);
+   setGmMatches([]);  // [CLAUDE - 08:00] reset immediato — evita dati del girone precedente
    setGmForm({ matchday: "", date: "", homeTeamId: "", awayTeamId: "", homeScore: "", awayScore: "" });
    setGmLoading(true);
    const res = await fetch(`/api/groups/${group.id}`);
    if (res.ok) {
      const data = await res.json() as { groupMatches: GroupMatchItem[] };
      setGmMatches(data.groupMatches ?? []);
-   }
+   } else {
+     setGmError("Errore nel caricamento dei risultati del girone");
+   }
    setGmLoading(false);
  }
```

## Come testare

1. Aprire `/admin/partite` → tab "Partite"
2. Creare almeno 2 gironi con risultati esterni
3. Aprire il dialog "Risultati esterni" del **girone A** → i risultati del girone A appaiono
4. Chiudere il dialog
5. Aprire il dialog per il **girone B** → i risultati del girone B devono apparire (non quelli di A)

**Test del fallback errore (richiede DevTools):**
1. DevTools → Network → Offline (oppure blocca la richiesta `/api/groups/*`)
2. Aprire il dialog per un girone
3. Deve apparire il messaggio rosso "Errore nel caricamento dei risultati del girone"
4. Non devono apparire dati residui di precedenti fetch

## Come fare rollback

```bash
git revert 4d22b95
# oppure:
git checkout HEAD~1 -- src/components/AdminPartiteClient.tsx
```

## Livello di confidenza

**ALTO** — modifica di 4 righe in un blocco async ben isolato; zero rischi di regressione
su altre funzionalità. TypeScript compila senza errori.

---

*Nota per il mattino:* Ho anche identificato dead code non correlato a questo fix:
`src/app/classifica/page.tsx` e `src/components/ClassificaTableClient.tsx` non sono
collegati da nessuna parte (la nav punta a `/classifiche`, l'sitemap non include `/classifica`).
Potrebbe valere la pena pulirli in una sessione dedicata.
