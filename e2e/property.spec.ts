import {expect, test} from "@playwright/test";
import {mockPublicItem} from "./mocks";

// Property/rental tags are informational, like medical IDs, but with a
// single named contact (maintenance/host) instead of medical's multi-
// contact emergency list — this exercises category.contactButton, the
// generic single-contact config that renders that call button.
test("finder sees rental info and can call the maintenance contact", async ({page}) => {
  await mockPublicItem(page, {
    name: "Lakeview Cabin",
    category: "property",
    details: {
      wifi_network: "LakeviewGuest",
      wifi_password: "pinecone42",
      checkout_time: "11:00 AM",
      welcome_guide: "Coffee shop two blocks down. Thermostat is on the hallway wall.",
      maintenance_contact_name: "Pat",
      maintenance_contact_phone: "+15552223333",
    },
  });

  await page.goto("/c/mock-token");

  await expect(page.getByRole("heading", {name: "Lakeview Cabin"})).toBeVisible();
  await expect(page.getByText("LakeviewGuest")).toBeVisible();
  await expect(page.getByText("11:00 AM")).toBeVisible();
  await expect(page.getByText(/Coffee shop two blocks down/)).toBeVisible();

  const callButton = page.getByRole("link", {name: /Call maintenance\/host — Pat/});
  await expect(callButton).toBeVisible();
  await expect(callButton).toHaveAttribute("href", "tel:+15552223333");

  // No report flow on an informational category.
  await expect(page.getByRole("button", {name: /Something seems wrong/})).toHaveCount(0);
});

test("hides the maintenance call button when no contact phone is set", async ({page}) => {
  await mockPublicItem(page, {
    name: "Lakeview Cabin",
    category: "property",
    details: {wifi_network: "LakeviewGuest"},
  });

  await page.goto("/c/mock-token");

  await expect(page.getByRole("link", {name: /Call maintenance/})).toHaveCount(0);
});
