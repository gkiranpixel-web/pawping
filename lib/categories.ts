// Central place that turns a raw "cats" row (pet, item, medical, or
// property) into the copy and layout the public scan page (`/c/[token]`,
// `/tag/[token]`, `/poster/[token]`) renders. Adding a category should
// mostly mean adding an entry here, not touching the page components.
//
// Two shapes of category:
//  - "findable" (hasReportFlow: true) — a pet or a physical item that can
//    be with its owner or away from them. Reuses the existing status
//    ("safe"/"missing") and report flow (report_type "saw"/"have") as-is.
//  - "informational" (hasReportFlow: false) — nothing to "find"; the scan
//    just shows curated info from `details`. Medical IDs and property/
//    rental tags are this shape. `medicalEmergency: true` additionally
//    surfaces an emergency-contact call button ahead of the info list.

export type CategoryKey = "pet" | "item" | "property" | "medical";
export type FieldSource = "field" | "details";

export interface FieldSpec {
  key: string;
  labelKey: string;
  source?: FieldSource;
}

export interface StatusCopy {
  eyebrowKey: string;
  pillKey: string;
  headlineKey: string;
  toneKey: string;
}

export interface Category {
  label: string;
  icon: string;
  hasReportFlow: boolean;
  // The name the *public scan page* shows for this category — distinct
  // from the app's own identity (TagPing), which stays constant across
  // the owner dashboard, PWA install, etc. Lets "pet" keep the original,
  // familiar PawPing name a finder is more likely to trust/recognize,
  // while other categories get a name that fits them specifically.
  brand: string;
  medicalEmergency?: boolean;
  facts?: FieldSpec[];
  copy?: { safe: StatusCopy; missing: StatusCopy };
  infoEyebrowKey?: string;
  infoFields?: FieldSpec[];
}

// A row as returned by get_public_item — loosely typed (jsonb `details`
// can hold any category's fields) rather than a strict per-category union,
// since the public page branches on `category` at runtime, not on types.
export interface PublicItemRow {
  name: string;
  photo_url: string | null;
  age: string | null;
  color: string | null;
  temperament: string | null;
  health_note: string | null;
  status: "safe" | "missing";
  category: CategoryKey;
  details: Record<string, string> | null;
  created_at: string;
  is_owner_beta: boolean;
}

export const CATEGORIES: Record<CategoryKey, Category> = {
  pet: {
    label: "Pet",
    icon: "🐈",
    hasReportFlow: true,
    brand: "PawPing",
    facts: [
      {key: "color", labelKey: "facts.color", source: "field"},
      {key: "age", labelKey: "facts.age", source: "field"},
    ],
    copy: {
      safe: {eyebrowKey:"pet.safe.eyebrow", pillKey:"pet.safe.pill", headlineKey:"pet.safe.headline", toneKey:"pet.safe.tone"},
      missing: {eyebrowKey:"pet.missing.eyebrow", pillKey:"pet.missing.pill", headlineKey:"pet.missing.headline", toneKey:"pet.missing.tone"},
    },
  },
  item: {
    label: "Item (keys, bag, bike, electronics...)",
    icon: "🎒",
    hasReportFlow: true,
    brand: "TagPing",
    facts: [
      {key: "color", labelKey: "facts.color", source: "field"},
      {key: "brand", labelKey: "facts.brand", source: "details"},
    ],
    copy: {
      safe: {eyebrowKey:"item.safe.eyebrow", pillKey:"item.safe.pill", headlineKey:"item.safe.headline", toneKey:"item.safe.tone"},
      missing: {eyebrowKey:"item.missing.eyebrow", pillKey:"item.missing.pill", headlineKey:"item.missing.headline", toneKey:"item.missing.tone"},
    },
  },
  property: {
    label: "Property / rental item",
    icon: "🏷️",
    hasReportFlow: false,
    medicalEmergency: false,
    brand: "StayPing",
    infoEyebrowKey: "property.infoEyebrow",
    infoFields: [
      {key: "wifi_network", labelKey: "fields.wifiNetwork", source: "details"},
      {key: "wifi_password", labelKey: "fields.wifiPassword", source: "details"},
      {key: "checkin_note", labelKey: "fields.checkinNote", source: "details"},
      {key: "house_rules_url", labelKey: "fields.houseRules", source: "details"},
    ],
  },
  medical: {
    label: "Medical ID",
    icon: "⛑️",
    hasReportFlow: false,
    medicalEmergency: true,
    brand: "VitalPing",
    infoEyebrowKey: "medical.infoEyebrow",
    infoFields: [
      {key: "blood_type", labelKey: "fields.bloodType", source: "details"},
      {key: "allergies", labelKey: "fields.allergies", source: "details"},
      {key: "medications", labelKey: "fields.medications", source: "details"},
      {key: "conditions", labelKey: "fields.conditions", source: "details"},
    ],
  },
};

export function getCategory(key?: string | null): Category {
  return (key && CATEGORIES[key as CategoryKey]) || CATEGORIES.pet;
}

export function categoryList(): {value: CategoryKey; label: string}[] {
  return (Object.entries(CATEGORIES) as [CategoryKey, Category][]).map(([value, c]) => ({value, label: c.label}));
}

// Reads a "fact" or "info field" off a row, honoring source: "field" (a
// real cats column) vs "details" (a key inside the details jsonb blob).
export function readField(row: Partial<PublicItemRow> | null | undefined, spec: FieldSpec): string | undefined {
  if (spec.source === "details") return row?.details?.[spec.key];
  return (row as Record<string, unknown> | null | undefined)?.[spec.key] as string | undefined;
}

export interface DetailFieldSpec {
  key: string;
  label: string;
  placeholder?: string;
}

// Owner-facing editable fields per category, shown in the add/edit form on
// the dashboard. Deliberately separate from `facts`/`infoFields` (what a
// finder sees) — e.g. medical's emergency-contact fields are editable here
// but rendered as a call button on the public page, not in a plain list.
export const DETAIL_FIELDS: Record<CategoryKey, DetailFieldSpec[]> = {
  pet: [
    {key:"reward_note", label:"Reward (optional)", placeholder:"e.g. $50 reward, no questions asked"},
  ],
  item: [
    {key:"brand", label:"Brand / model", placeholder:"e.g. Herschel backpack"},
    {key:"reward_note", label:"Reward (optional)", placeholder:"e.g. $50 reward, no questions asked"},
  ],
  property: [
    {key:"wifi_network", label:"Wi-Fi network"},
    {key:"wifi_password", label:"Wi-Fi password"},
    {key:"checkin_note", label:"Check-in note", placeholder:"e.g. Key is in the lockbox, code 4821"},
    {key:"house_rules_url", label:"House rules link"},
  ],
  medical: [
    {key:"blood_type", label:"Blood type"},
    {key:"allergies", label:"Allergies"},
    {key:"medications", label:"Medications"},
    {key:"conditions", label:"Conditions to know about"},
    {key:"emergency_contact_name", label:"Emergency contact name"},
    {key:"emergency_contact_phone", label:"Emergency contact phone", placeholder:"Shown to anyone who scans this — for real emergencies only"},
  ],
};

export function detailFieldsFor(categoryKey?: string | null): DetailFieldSpec[] {
  return (categoryKey && DETAIL_FIELDS[categoryKey as CategoryKey]) || [];
}
