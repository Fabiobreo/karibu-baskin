import { describe, it, expect } from "vitest";
import { duplicateFormValues, romeDateTime } from "./trainingDuplicate";
import { CLUB_VENUE_LABEL } from "@/lib/clubVenue";

// Sabato 17 ottobre 2026, 10:00-12:00 a Roma (ora legale, UTC+2).
const saturday = {
  title: "Allenamento del sabato",
  date: "2026-10-17T08:00:00.000Z",
  endTime: "2026-10-17T10:00:00.000Z",
  location: null,
};

describe("romeDateTime", () => {
  it("legge data e ora a Roma, non in UTC", () => {
    expect(romeDateTime(new Date("2026-10-17T22:30:00.000Z"))).toEqual({
      date: "2026-10-18",
      time: "00:30",
    });
  });
});

describe("duplicateFormValues", () => {
  it("propone il sabato dopo alla stessa ora, con titolo e orari copiati", () => {
    const v = duplicateFormValues(saturday, new Date("2026-10-17T12:00:00.000Z"));
    expect(v).toEqual({
      title: "Allenamento del sabato",
      // Il 25 ottobre finisce l'ora legale: resta alle 10, non alle 9.
      date: "2026-10-24",
      time: "10:00",
      endTime: "12:00",
      location: CLUB_VENUE_LABEL,
    });
  });

  it("a cavallo del cambio d'ora tiene l'ora di Roma", () => {
    const v = duplicateFormValues(
      { ...saturday, date: "2026-10-24T08:00:00.000Z", endTime: null },
      new Date("2026-10-24T12:00:00.000Z")
    );
    expect(v.date).toBe("2026-10-31");
    expect(v.time).toBe("10:00");
    expect(v.endTime).toBe("");
  });

  it("da un allenamento vecchio salta alla prima data futura", () => {
    const v = duplicateFormValues(saturday, new Date("2026-11-11T09:00:00.000Z"));
    expect(v.date).toBe("2026-11-14");
  });

  it("se oggi è sabato ma l'ora è già passata, propone il sabato dopo", () => {
    const v = duplicateFormValues(saturday, new Date("2026-10-31T09:30:00.000Z"));
    expect(v.date).toBe("2026-11-07");
  });

  it("da un allenamento futuro propone la settimana dopo quello", () => {
    const v = duplicateFormValues(saturday, new Date("2026-10-12T09:00:00.000Z"));
    expect(v.date).toBe("2026-10-24");
  });

  it("copia il luogo di una trasferta", () => {
    const v = duplicateFormValues(
      { ...saturday, location: "Palestra di Arzignano" },
      new Date("2026-10-17T12:00:00.000Z")
    );
    expect(v.location).toBe("Palestra di Arzignano");
  });
});
