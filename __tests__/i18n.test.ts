import {describe, expect, it} from "vitest";
import {detectLocale, LOCALES, makeT, STRINGS} from "../lib/i18n";

describe("detectLocale", () => {
  it("falls back to 'en' when there is no browser (e.g. on the server/in tests)", () => {
    expect(detectLocale()).toBe("en");
  });
});

describe("makeT", () => {
  it("looks up a key in the requested locale", () => {
    const t = makeT("es");
    expect(t("ui.loading")).toBe("Cargando...");
  });

  it("interpolates {vars} into the string", () => {
    const t = makeT("en");
    expect(t("pet.safe.headline", {name: "Milo"})).toBe("Say hello to Milo!");
  });

  it("falls back to the English string for an unknown locale", () => {
    const t = makeT("zz");
    expect(t("ui.loading")).toBe(STRINGS.en["ui.loading"]);
  });

  it("falls back to the key itself when the key exists nowhere", () => {
    const t = makeT("en");
    expect(t("ui.doesNotExist")).toBe("ui.doesNotExist");
  });
});

// This replaces a one-off manual script that was run by hand to check every
// locale had the same keys as English. Missing keys silently render an
// English fallback per-string (see makeT), which is a soft failure a
// finder would never report — so this stays a real, always-run test rather
// than something a future edit could just forget to re-run.
describe("locale key coverage", () => {
  const englishKeys = Object.keys(STRINGS.en).sort();

  it("declares at least one non-English locale to check", () => {
    expect(LOCALES.length).toBeGreaterThan(1);
  });

  it.each(LOCALES.filter(l => l.code !== "en"))("$code has exactly the same keys as en", ({code}) => {
    const keys = Object.keys(STRINGS[code] || {}).sort();
    const missing = englishKeys.filter(k => !keys.includes(k));
    const extra = keys.filter(k => !englishKeys.includes(k));
    expect(missing, `${code} is missing keys`).toEqual([]);
    expect(extra, `${code} has extra keys not in en`).toEqual([]);
  });

  it.each(LOCALES)("$code has no empty string values", ({code}) => {
    const empties = Object.entries(STRINGS[code] || {}).filter(([, v]) => !v || !v.trim());
    expect(empties.map(([k]) => k)).toEqual([]);
  });
});
