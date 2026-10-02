import { describe, it, expect } from "vitest";
import { notificationDisplay, NEW_TRAINING_TITLE } from "./notificationDisplay";

describe("notificationDisplay()", () => {
  it("allenamento nuovo: il contenuto è il titolo, il tipo è l'occhiello", () => {
    expect(
      notificationDisplay({
        type: "NEW_TRAINING",
        title: NEW_TRAINING_TITLE,
        body: "Allenamento a luglio: mercoledì 15 luglio, 18:00–20:00",
      })
    ).toEqual({
      headline: "Allenamento a luglio: mercoledì 15 luglio, 18:00–20:00",
      detail: null,
      eyebrow: "Nuovo allenamento",
      eyebrowKey: "NEW_TRAINING",
    });
  });

  it("allenamento cambiato: cosa è cambiato resta il titolo", () => {
    for (const title of ["Iscrizioni chiuse", "Allenamento aggiornato"]) {
      expect(
        notificationDisplay({
          type: "NEW_TRAINING",
          title,
          body: "Allenamento a luglio: mercoledì 15 luglio, 18:00–20:00",
        })
      ).toEqual({
        headline: title,
        detail: "Allenamento a luglio: mercoledì 15 luglio, 18:00–20:00",
        eyebrow: null,
        eyebrowKey: "NEW_TRAINING",
      });
    }
  });

  it("toglie le emoji in testa anche quando sono sequenze", () => {
    const head = (title: string) =>
      notificationDisplay({ type: "SYSTEM", title, body: "" }).headline;
    expect(head("\u{1F9D1}\u200D\u{1F9BD} Ruolo 1")).toBe("Ruolo 1");
    expect(head("\u{1F44D}\u{1F3FD} Bravi")).toBe("Bravi");
    expect(head("\u26A0\uFE0F Palestra chiusa")).toBe("Palestra chiusa");
    expect(head("\u{1F1EE}\u{1F1F9} Nazionale")).toBe("Nazionale");
    expect(head("\u{1F3C0}\u{1F4CB} Due di fila")).toBe("Due di fila");
    // I numeri e il testo normale restano.
    expect(head("10 anni di Karibu")).toBe("10 anni di Karibu");
    // L'emoji in mezzo non si tocca.
    expect(head("Bravi \u{1F389}")).toBe("Bravi \u{1F389}");
  });

  it("traguardo: toglie l'emoji in testa all'occhiello", () => {
    const d = notificationDisplay({
      type: "BADGE_UNLOCKED",
      title: "🏅 Nuovo traguardo!",
      body: 'Hai sbloccato il traguardo "Bomber" 🎉',
    });
    expect(d.eyebrow).toBe("Nuovo traguardo!");
    expect(d.headline).toBe('Hai sbloccato il traguardo "Bomber" 🎉');
  });

  it("risultato: il titolo è già il contenuto e resta titolo", () => {
    expect(
      notificationDisplay({
        type: "MATCH_RESULT",
        title: "🏀 Vittoria! Arancioni vs Vicenza",
        body: "Risultato finale: 60–52",
      })
    ).toEqual({
      headline: "Vittoria! Arancioni vs Vicenza",
      detail: "Risultato finale: 60–52",
      eyebrow: null,
      eyebrowKey: "MATCH_RESULT",
    });
  });

  it("collegamento e compleanno hanno la loro etichetta", () => {
    expect(notificationDisplay({ type: "LINK_REQUEST", title: "t", body: "b" }).eyebrowKey).toBe(
      "LINK_REQUEST"
    );
    expect(notificationDisplay({ type: "BIRTHDAY", title: "🎂 Auguri", body: "b" })).toMatchObject({
      headline: "Auguri",
      eyebrowKey: "BIRTHDAY",
    });
  });

  it("tipo sconosciuto o di sistema: titolo, dettaglio, etichetta generica", () => {
    expect(
      notificationDisplay({ type: "SYSTEM", title: "Disponibilità partita", body: "Rispondi" })
    ).toEqual({
      headline: "Disponibilità partita",
      detail: "Rispondi",
      eyebrow: null,
      eyebrowKey: "SYSTEM",
    });
    expect(notificationDisplay({ type: "FUTURO", title: "x", body: "" }).eyebrowKey).toBe("SYSTEM");
  });

  it("senza corpo non resta una riga vuota", () => {
    expect(notificationDisplay({ type: "NEW_POST", title: "Nuova news", body: " " })).toEqual({
      headline: "Nuova news",
      detail: null,
      eyebrow: null,
      eyebrowKey: "SYSTEM",
    });
  });
});
