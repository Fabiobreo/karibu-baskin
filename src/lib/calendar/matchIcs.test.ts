import { describe, it, expect } from "vitest";
import { googleEventUrl, matchEnd, matchSummary, matchVevent, singleEventCalendar } from "./ics";

const base = {
  id: "m1",
  // 15:00 a Roma (ora legale) = 13:00 UTC
  date: new Date("2026-10-04T13:00:00Z"),
  isHome: false,
  teamName: "Montekki",
  opponentName: "Orsi Bassano",
  location: "Via Roma 1, Bassano del Grappa",
};

describe("matchVevent", () => {
  it("usa lo stesso UID del feed e orari in UTC", () => {
    const ev = matchVevent(base);
    expect(ev).toContain("UID:match-m1@karibubaskin.it");
    expect(ev).toContain("DTSTART:20261004T130000Z");
    expect(ev).toContain("DTEND:20261004T143000Z");
    expect(ev).toContain("SUMMARY:Montekki @ Orsi Bassano");
    expect(ev).toContain("LOCATION:Via Roma 1\\, Bassano del Grappa");
  });

  it("senza luogo non scrive LOCATION e non ha note", () => {
    const ev = matchVevent({ ...base, isHome: true, location: null });
    expect(ev).toContain("SUMMARY:Montekki vs Orsi Bassano");
    expect(ev).not.toContain("LOCATION:");
    expect(ev).not.toContain("DESCRIPTION:");
  });
});

describe("singleEventCalendar", () => {
  it("avvolge un solo VEVENT in un VCALENDAR valido", () => {
    const ics = singleEventCalendar(matchVevent(base));
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR")).toBe(true);
    expect((ics.match(/BEGIN:VEVENT/g) ?? []).length).toBe(1);
  });
});

describe("googleEventUrl", () => {
  it("compila titolo, orari UTC e luogo come il feed", () => {
    const url = new URL(
      googleEventUrl({
        title: matchSummary(base),
        start: base.date,
        end: matchEnd(base.date),
        location: base.location,
      })
    );
    expect(url.origin + url.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("text")).toBe("Montekki @ Orsi Bassano");
    expect(url.searchParams.get("dates")).toBe("20261004T130000Z/20261004T143000Z");
    expect(url.searchParams.get("location")).toBe("Via Roma 1, Bassano del Grappa");
  });

  it("senza luogo non mette il parametro", () => {
    const url = new URL(googleEventUrl({ title: "x", start: base.date, end: base.date }));
    expect(url.searchParams.has("location")).toBe(false);
  });
});
