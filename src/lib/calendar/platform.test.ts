import { describe, expect, it } from "vitest";
import { calendarPlatform } from "./platform";

const ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36";
const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";
const WINDOWS =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36";

describe("calendarPlatform", () => {
  it("riconosce Android", () => {
    expect(calendarPlatform(ANDROID)).toBe("android");
  });

  it("riconosce iPhone e l'iPad che si presenta come Mac", () => {
    expect(calendarPlatform(IPHONE)).toBe("ios");
    expect(calendarPlatform(MAC, 5)).toBe("ios");
  });

  it("tratta Mac e Windows come computer", () => {
    expect(calendarPlatform(MAC, 0)).toBe("desktop");
    expect(calendarPlatform(WINDOWS)).toBe("desktop");
    expect(calendarPlatform("")).toBe("desktop");
  });
});
