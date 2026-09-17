import { permanentRedirect } from "next/navigation";

// 308: l'indirizzo è stato sostituito per sempre, così i motori di ricerca
// passano a /squadre invece di continuare a riprovare il vecchio URL.
export default function LaSquadraRedirect() {
  permanentRedirect("/squadre");
}
