import {Page} from "@playwright/test";

// Shape returned by the get_public_item RPC (see supabase/migrations and
// lib/categories.ts's PublicItemRow) — only the fields these tests read are
// required, the rest default to null/false like a real row would for an
// item with nothing set.
export interface MockItem {
  name: string;
  photo_url?: string | null;
  age?: string | null;
  color?: string | null;
  temperament?: string | null;
  health_note?: string | null;
  status?: "safe" | "missing";
  category: "pet" | "item" | "property" | "medical";
  details?: Record<string, unknown> | null;
  created_at?: string;
  is_owner_beta?: boolean;
}

// Intercepts the Supabase client's call to get_public_item and returns a
// single mock row, without ever reaching a real Supabase project.
export async function mockPublicItem(page: Page, item: MockItem) {
  const row = {
    photo_url: null,
    age: null,
    color: null,
    temperament: null,
    health_note: null,
    status: "safe" as const,
    details: null,
    created_at: "2026-06-01T00:00:00Z",
    is_owner_beta: false,
    ...item,
  };
  await page.route("**/rest/v1/rpc/get_public_item", route =>
    route.fulfill({status: 200, contentType: "application/json", body: JSON.stringify([row])})
  );
}

// Intercepts the finder-report submission so it never hits our own
// server (and, in turn, never needs real Supabase credentials there
// either) — the point of this suite is testing the page, not the API.
export async function mockReportEndpoint(page: Page) {
  await page.route("**/api/report", route =>
    route.fulfill({status: 200, contentType: "application/json", body: JSON.stringify({ok: true, notified: 1})})
  );
}
