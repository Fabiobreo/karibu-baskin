import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ADMIN_NAV, activeAdminSection } from "./adminNav";

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
