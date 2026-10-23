import { describe, it, expect } from "vitest";
import robots, { BLOCKED_CRAWLERS } from "./robots";

describe("robots.txt", () => {
  it("esclude da tutto il sito i crawler di addestramento AI e SEO", () => {
    const rule = [robots().rules].flat().find((r) => r.disallow === "/");
    expect(rule?.userAgent).toEqual(BLOCKED_CRAWLERS);
    expect(BLOCKED_CRAWLERS).toEqual(expect.arrayContaining(["GPTBot", "ClaudeBot", "AhrefsBot"]));
  });

  it("lascia passare motori di ricerca, AI che cercano e anteprime dei link", () => {
    for (const bot of [
      "Googlebot",
      "Bingbot",
      "OAI-SearchBot",
      "ChatGPT-User",
      "PerplexityBot",
      "Claude-SearchBot",
      "Claude-User",
      "facebookexternalhit",
      "WhatsApp",
      "TelegramBot",
    ]) {
      expect(BLOCKED_CRAWLERS).not.toContain(bot);
    }
  });
});
