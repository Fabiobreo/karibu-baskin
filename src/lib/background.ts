import { after } from "next/server";

/**
 * Lavoro da fare dopo aver risposto (push, notifiche in-app, audit, badge),
 * senza far aspettare chi ha chiamato l'API.
 *
 * Non basta lanciare la promessa e non aspettarla: su Vercel la funzione viene
 * congelata appena la risposta è partita, e la promessa resta a metà finché
 * la stessa istanza non si risveglia (anche ore dopo) o viene buttata. Era il
 * motivo delle push perse o in ritardo di ore. `after()` di Next.js dice a
 * Vercel di tenere viva la funzione finché il lavoro non è finito.
 *
 * Fuori da una richiesta (test, script) `after()` lancia un errore: lì la
 * promessa gira comunque da sola, e basta non far cadere l'errore.
 */
export function inBackground(task: Promise<unknown>, label: string): void {
  const safe = task.catch((err) => console.error(`[${label}]`, err));
  try {
    after(safe);
  } catch {
    // Fuori da una richiesta: `safe` è già partita e gestisce i suoi errori.
  }
}
