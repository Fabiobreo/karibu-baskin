import { describe, expect, it } from "vitest";
import { SITE_URL } from "@/lib/siteUrl";
import {
  decodeReferral,
  describeReferral,
  encodeReferral,
  referralFromSearch,
  withUtm,
} from "./utm";

describe("withUtm", () => {
  it("restituisce l'URL assoluto con i parametri e l'ancora in fondo", () => {
    expect(withUtm("/contatti#vieni-a-provare", { source: "instagram", medium: "bio" })).toBe(
      `${SITE_URL}/contatti?utm_source=instagram&utm_medium=bio#vieni-a-provare`
    );
  });

  it("ha il link della scheda Google (UX-62)", () => {
    expect(withUtm("/", { source: "google", medium: "maps" })).toBe(
      `${SITE_URL}/?utm_source=google&utm_medium=maps`
    );
  });

  it("aggiunge la campagna se c'è", () => {
    const url = new URL(
      withUtm("/", { source: "volantino", medium: "print", campaign: "open-day-2027" })
    );
    expect(url.searchParams.get("utm_campaign")).toBe("open-day-2027");
  });

  it("tiene i parametri già presenti senza duplicarli", () => {
    const out = withUtm("/eventi?anno=2027&utm_source=qr", {
      source: "volantino",
      medium: "print",
    });
    const url = new URL(out);
    expect(url.searchParams.get("anno")).toBe("2027");
    expect(url.searchParams.getAll("utm_source")).toEqual(["qr"]);
    expect(url.searchParams.get("utm_medium")).toBe("print");
  });

  it("accetta un URL assoluto del sito", () => {
    expect(withUtm(`${SITE_URL}/news`, { source: "email", medium: "share" })).toBe(
      `${SITE_URL}/news?utm_source=email&utm_medium=share`
    );
  });

  it("non tocca gli URL esterni", () => {
    const ext = "https://www.comune.montecchio-maggiore.vi.it/sport";
    expect(withUtm(ext, { source: "partner", medium: "referral" })).toBe(ext);
  });

  it("rifiuta una campagna con maiuscole o spazi", () => {
    expect(() => withUtm("/", { source: "qr", medium: "print", campaign: "Open Day" })).toThrow();
  });

  it("i valori fuori elenco sono errori di tipo", () => {
    // @ts-expect-error: "wa" non è una fonte ammessa
    withUtm("/", { source: "wa", medium: "share" });
    // @ts-expect-error: "story" non è un mezzo ammesso
    withUtm("/", { source: "instagram", medium: "story" });
  });
});

describe("cookie di provenienza", () => {
  it("legge i parametri UTM dall'indirizzo", () => {
    expect(referralFromSearch("?utm_source=volantino&utm_medium=print")).toEqual({
      source: "volantino",
      medium: "print",
      campaign: null,
    });
    expect(referralFromSearch("?utm_medium=print")).toBeNull();
  });

  it("ripulisce i valori scritti a mano", () => {
    expect(referralFromSearch("?utm_source=<script>WA")?.source).toBe("scriptwa");
  });

  it("andata e ritorno dal cookie", () => {
    const ref = { source: "instagram", medium: "bio", campaign: "open-day-2027" };
    expect(decodeReferral(encodeURIComponent(encodeReferral(ref)))).toEqual(ref);
    expect(decodeReferral(encodeReferral({ source: "qr", medium: null, campaign: null }))).toEqual({
      source: "qr",
      medium: null,
      campaign: null,
    });
    expect(decodeReferral("%E0%A4%A")).toBeNull();
    expect(decodeReferral("")).toBeNull();
  });

  it("descrive la provenienza per l'email allo staff", () => {
    expect(describeReferral({ source: "volantino", medium: "print", campaign: null })).toBe(
      "volantino, print"
    );
  });
});
