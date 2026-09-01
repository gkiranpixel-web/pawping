import {describe, expect, it} from "vitest";
import {
  CATEGORIES,
  categoryList,
  detailFieldsFor,
  getCategory,
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
    expect(fields).toContain("emergency_contact_phone");
  });

  it("returns an empty array for an unknown or missing category", () => {
    expect(detailFieldsFor("dinosaur")).toEqual([]);
    expect(detailFieldsFor(undefined)).toEqual([]);
  });
});
