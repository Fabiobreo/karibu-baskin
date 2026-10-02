/**
 * Il livello come lo legge lo staff (UX-40).
 *
 * Il sistema stima il livello di ognuno dai risultati delle partitelle
 * (TrueSkill: una media e un'incertezza). Allo staff quei due numeri non si
 * mostrano più accanto ai nomi: l'incertezza per persona è larga quanto
 * l'intervallo in cui sta mezza rosa, e una cifra vicino a un nome invita a
 * classifiche che non reggono. Si mostra un numero solo dove serve a una
 * decisione, cioè per una formazione intera, sulla stessa scala dell'avversaria.
 */

/** Un livello come intero: i decimali sono falsa precisione. */
export function displayLevel(mu: number): number {
  return Math.round(mu);
}

/**
 * Forza di una formazione: la media dei livelli di chi è in campo. La media e
 * non la somma, così sta sulla scala del livello dell'avversaria (che è per
 * giocatore) e i due numeri si confrontano a occhio.
 */
export function formationStrength(muSum: number, players: number): number {
  if (players <= 0) return 0;
  return displayLevel(muSum / players);
}
