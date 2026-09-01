import {describe, expect, it} from "vitest";
import {
  CATEGORIES,
  categoryList,
  coreFieldsFor,
  detailFieldsFor,
  getCategory,
  privateDetailFieldsFor,
  readField,
} from "../lib/categories";

describe("getCategory", () => {
  it("returns the matching category for a known key", () => {
    expect(getCategory("medical").label).toBe("Medical ID");
    expect(getCategory("property").hasReportFlow).toBe(false);
  });

  // Each category has its own public-facing brand shown on the scan page —
  // pet keeps the original PawPing name, the others get one that fits them.
  it("gives each category its chosen public-facing brand", () => {
    expect(getCategory("pet").brand).toBe("PawPing");
    expect(getCategory("item").brand).toBe("TagPing");
    expect(getCategory("property").brand).toBe("StayPing");
    expect(getCategory("medical").brand).toBe("VitalPing");
  });

  it("falls back to pet for an unknown or missing key", () => {
    expect(getCategory("dinosaur")).toBe(CATEGORIES.pet);
    expect(getCategory(undefined)).toBe(CATEGORIES.pet);
    expect(getCategory(null)).toBe(CATEGORIES.pet);
  });
});

describe("categoryList", () => {
  it("lists every category as a value/label pair, in declaration order", () => {
    expect(categoryList()).toEqual([
      {value: "pet", label: "Pet"},
      {value: "item", label: "Item (keys, bag, bike, electronics...)"},
      {value: "property", label: "Property / rental item"},
      {value: "medical", label: "Medical ID"},
    ]);
  });
});

describe("category shape", () => {
  it("gives every category a non-empty public-facing brand name", () => {
    for (const [key, cat] of Object.entries(CATEGORIES)) {
      expect(cat.brand?.trim(), `${key}.brand`).toBeTruthy();
    }
  });

  it("gives every findable category (hasReportFlow: true) facts and safe/missing copy", () => {
    for (const [key, cat] of Object.entries(CATEGORIES)) {
      if (!cat.hasReportFlow) continue;
      expect(cat.facts?.length, `${key}.facts`).toBeGreaterThan(0);
      expect(cat.copy?.safe, `${key}.copy.safe`).toBeTruthy();
      expect(cat.copy?.missing, `${key}.copy.missing`).toBeTruthy();
    }
  });

  it("gives every informational category (hasReportFlow: false) infoFields", () => {
    for (const [key, cat] of Object.entries(CATEGORIES)) {
      if (cat.hasReportFlow) continue;
      expect(cat.infoFields?.length, `${key}.infoFields`).toBeGreaterThan(0);
      expect(cat.infoEyebrowKey, `${key}.infoEyebrowKey`).toBeTruthy();
    }
  });

  // Regression test: every owner-editable value for an informational
  // category (medical, property) is saved into the `details` jsonb column,
  // never as a top-level cats column (see supabase/migrations/*v13*). An
  // infoField missing `source: "details"` silently reads a column that
  // doesn't exist and always renders blank on the public page — that bug
  // shipped once already (fixed alongside this test) and produced no error,
  // just an info page that always said "No additional details have been
  // added yet." regardless of what the owner filled in.
  it("sources every informational category's infoFields from details, not a bare column", () => {
    for (const [key, cat] of Object.entries(CATEGORIES)) {
      if (cat.hasReportFlow) continue;
      for (const field of cat.infoFields || []) {
        expect(field.source, `${key}.infoFields.${field.key}.source`).toBe("details");
      }
    }
  });

  // property gets a single "call maintenance/host" button instead of a
  // plain info row for its contact — different shape from medical's
  // multi-contact list, so it's configured, not hardcoded in the page.
  it("gives property a contactButton wired to its maintenance contact fields", () => {
    const cb = CATEGORIES.property.contactButton;
    expect(cb?.phoneKey).toBe("maintenance_contact_phone");
    expect(cb?.nameKey).toBe("maintenance_contact_name");
    expect(cb?.labelKey).toBeTruthy();
    expect(cb?.namedLabelKey).toBeTruthy();
  });

  // Security regression test: PRIVATE_DETAIL_FIELDS exists precisely so an
  // owner-only value (e.g. an item's serial number) never ends up
  // somewhere a finder's browser receives it — get_public_item selects
  // `details` in full but never `private_details` (see the v17
  // migration). A private field key that also appears in the *same*
  // category's DETAIL_FIELDS, facts, or infoFields would defeat that: it'd
  // get saved into `details` (or read as if it were public) instead of
  // staying in `private_details`. This asserts that never happens.
  for (const [key, cat] of Object.entries(CATEGORIES)) {
    it(`never exposes a ${key} private field key as a public one`, () => {
      const privateKeys = new Set(privateDetailFieldsFor(key).map(f => f.key));
      if (!privateKeys.size) return;
      const publicKeys = new Set([
        ...detailFieldsFor(key).map(f => f.key),
        ...(cat.facts || []).map(f => f.key),
        ...(cat.infoFields || []).map(f => f.key),
      ]);
      for (const k of privateKeys) {
        expect(publicKeys.has(k), `${key}.${k} is both private and public`).toBe(false);
      }
    });
  }
});

describe("readField", () => {
  it("reads a plain column when source is 'field' (or omitted)", () => {
    const row = {color: "black"};
    expect(readField(row, {key: "color", labelKey: "facts.color", source: "field"})).toBe("black");
  });

  it("reads a nested details key when source is 'details'", () => {
    const row = {details: {brand: "Herschel"}};
    expect(readField(row, {key: "brand", labelKey: "facts.brand", source: "details"})).toBe("Herschel");
  });

  it("returns undefined when the row or details is missing", () => {
    expect(readField(null, {key: "brand", labelKey: "facts.brand", source: "details"})).toBeUndefined();
    expect(readField({}, {key: "brand", labelKey: "facts.brand", source: "details"})).toBeUndefined();
  });
});

describe("detailFieldsFor", () => {
  it("returns the owner-editable fields for a known category", () => {
    const fields = detailFieldsFor("medical").map(f => f.key);
    expect(fields).toContain("blood_type");
    expect(fields).toContain("physician_phone");
    // Medical's emergency contacts moved to a dynamic list (owner.js's
    // ContactsEditor), saved as details.emergency_contacts — not a flat
    // DETAIL_FIELDS entry, so it should NOT appear here.
    expect(fields).not.toContain("emergency_contact_phone");
  });

  it("includes the newly added per-category fields", () => {
    expect(detailFieldsFor("pet").map(f => f.key)).toContain("behavior_note");
    expect(detailFieldsFor("item").map(f => f.key)).toContain("dropoff_note");
    expect(detailFieldsFor("property").map(f => f.key)).toEqual(
      expect.arrayContaining(["welcome_guide", "checkout_time", "maintenance_contact_name", "maintenance_contact_phone"])
    );
  });

  it("returns an empty array for an unknown or missing category", () => {
    expect(detailFieldsFor("dinosaur")).toEqual([]);
    expect(detailFieldsFor(undefined)).toEqual([]);
  });
});

describe("privateDetailFieldsFor", () => {
  it("returns item's serial number as a private-only field", () => {
    const fields = privateDetailFieldsFor("item");
    expect(fields.map(f => f.key)).toContain("serial_number");
  });

  it("returns an empty array for categories with no private fields, or an unknown category", () => {
    expect(privateDetailFieldsFor("pet")).toEqual([]);
    expect(privateDetailFieldsFor("dinosaur")).toEqual([]);
    expect(privateDetailFieldsFor(undefined)).toEqual([]);
  });
});


describe("coreFieldsFor", () => {
  // Regression test for a reported bug: the owner dashboard's add/edit
  // form always rendered age/color/temperament/health_note as plain,
  // pet-labeled inputs regardless of the selected category — including
  // for property and medical, where none of age/color/temperament are
  // ever read by the public page (see pages/c/[token].js's InfoPage,
  // which only reads name/health_note/details — never item.age/color/
  // temperament). coreFieldsFor is what the form now reads instead.
  it("gives pet the full set: color, age, temperament, health_note", () => {
    expect(coreFieldsFor("pet").map(f => f.key)).toEqual(["color", "age", "temperament", "health_note"]);
  });

  it("gives item color/temperament/health_note but not age (never shown for item)", () => {
    const keys = coreFieldsFor("item").map(f => f.key);
    expect(keys).toEqual(["color", "temperament", "health_note"]);
    expect(keys).not.toContain("age");
  });

  it("gives informational categories (property, medical) only health_note", () => {
    for (const key of ["property", "medical"] as const) {
      expect(coreFieldsFor(key).map(f => f.key), key).toEqual(["health_note"]);
    }
  });

  it("gives every category's health_note field a non-pet-specific label", () => {
    for (const key of Object.keys(CATEGORIES) as (keyof typeof CATEGORIES)[]) {
      const field = coreFieldsFor(key).find(f => f.key === "health_note");
      expect(field?.label, `${key}.health_note.label`).toBeTruthy();
      if (key !== "pet") {
        expect(field?.label.toLowerCase(), `${key}.health_note.label`).not.toContain("health");
      }
    }
  });

  it("returns an empty array for an unknown or missing category", () => {
    expect(coreFieldsFor("dinosaur")).toEqual([]);
    expect(coreFieldsFor(undefined)).toEqual([]);
  });
});
