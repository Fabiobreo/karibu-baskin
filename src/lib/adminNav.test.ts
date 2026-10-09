import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { ADMIN_NAV, activeAdminSection, adminNavFor, canOpenAdminSection } from "./adminNav";

describe("ADMIN_NAV", () => {
  it("ogni voce porta a una pagina che esiste", () => {
    const base = join(process.cwd(), "src", "app", "admin", "(dashboard)");
    for (const item of ADMIN_NAV) {
      const segment = item.href.replace(/^\/admin\/?/, "");
      expect(existsSync(join(base, segment, "page.tsx")), item.href).toBe(true);
    }
  });

  it("non ha indirizzi ripetuti", () => {
    const hrefs = ADMIN_NAV.map((i) => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

describe("activeAdminSection", () => {
  it("riconosce la dashboard solo sull'indirizzo esatto", () => {
    expect(activeAdminSection("/admin")?.label).toBe("Dashboard");
  });

  it("assegna le sottopagine alla loro sezione", () => {
    expect(activeAdminSection("/admin/partite/abc/convocazioni")?.label).toBe("Partite");
    expect(activeAdminSection("/admin/utenti/nuovo-figlio")?.label).toBe("Utenti");
    expect(activeAdminSection("/admin/squadre/t1/rosa")?.label).toBe("Squadre");
  });

  it("non confonde sezioni che iniziano allo stesso modo", () => {
    expect(activeAdminSection("/admin/avvisi")?.label).toBe("Avviso urgente");
    expect(activeAdminSection("/admin/avversarie")?.label).toBe("Squadre avversarie");
  });

  it("non assegna una sezione al login né alle pagine pubbliche", () => {
    expect(activeAdminSection("/admin/login")).toBeNull();
    expect(activeAdminSection("/partite")).toBeNull();
    expect(activeAdminSection(null)).toBeNull();
  });
});

describe("adminNavFor", () => {
  it("lo staff vede tutte le sezioni", () => {
    expect(adminNavFor("COACH")).toEqual(ADMIN_NAV);
    expect(adminNavFor("ADMIN")).toEqual(ADMIN_NAV);
  });

  it("il dirigente vede solo le sezioni in sola lettura", () => {
    expect(adminNavFor("DIRECTOR").map((i) => i.href)).toEqual([
      "/admin",
      "/admin/allenamenti",
      "/admin/partite",
      "/admin/eventi",
      "/admin/news",
      "/admin/gallery",
      "/admin/utenti",
      "/admin/squadre",
      "/admin/metriche",
      "/admin/esporta",
    ]);
  });

  it("al dirigente restano chiusi registro attività, livello dei giocatori e avvisi", () => {
    for (const href of ["/admin/audit", "/admin/sviluppo", "/admin/avvisi"]) {
      expect(canOpenAdminSection("DIRECTOR", href), href).toBe(false);
      expect(canOpenAdminSection("COACH", href), href).toBe(true);
    }
  });

  it("chi non entra nel pannello non vede nulla", () => {
    for (const role of ["GUEST", "ATHLETE", "PARENT", null, undefined] as const) {
      expect(adminNavFor(role)).toEqual([]);
      expect(canOpenAdminSection(role, "/admin")).toBe(false);
    }
  });

  it("una sottopagina segue la sua sezione", () => {
    expect(canOpenAdminSection("DIRECTOR", "/admin/utenti/nuovo")).toBe(true);
    expect(canOpenAdminSection("DIRECTOR", "/admin/squadre/t1/rosa")).toBe(true);
    expect(canOpenAdminSection("DIRECTOR", "/admin/gironi/abc")).toBe(false);
  });
});

/**
 * Il layout del pannello fa entrare anche il dirigente, che vede solo alcune
 * sezioni: ogni pagina deve avere la sua guardia, altrimenti gli si apre.
 */
describe("pagine del pannello", () => {
  const base = join(process.cwd(), "src", "app", "admin", "(dashboard)");
  const findPages = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) return findPages(full);
      return name === "page.tsx" ? [full] : [];
    });
  const pages = findPages(base).map((file) => ({
    key: file.slice(base.length + 1).replace(/\\/g, "/"),
    src: readFileSync(file, "utf8"),
  }));

  it.each(pages.map((p) => [p.key, p.src] as const))("%s ha la sua guardia", (_key, src) => {
    expect(src).toMatch(/\bawait requireAdminPage\(/);
  });

  it("le pagine aperte al dirigente sono solo quelle delle sue sezioni", () => {
    const open = pages
      .filter(
        (p) =>
          /requireAdminPage\("[^"]+"\)/.test(p.src) &&
          canOpenAdminSection("DIRECTOR", `/admin/${p.key}`.replace(/\/page\.tsx$/, ""))
      )
      .map((p) => p.key)
      .sort();
    // Convocazioni e statistiche di una partita restano dello staff: hanno il
    // loro controllo e non compaiono qui, anche se "Partite" è aperta.
    expect(open).toEqual([
      "allenamenti/page.tsx",
      "esporta/page.tsx",
      "eventi/page.tsx",
      "gallery/page.tsx",
      "metriche/page.tsx",
      "news/page.tsx",
      "page.tsx",
      "partite/page.tsx",
      "squadre/[teamId]/rosa/page.tsx",
      "squadre/page.tsx",
      "utenti/page.tsx",
    ]);
  });
});
