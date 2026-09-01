import {expect, test} from "@playwright/test";
import {mockPublicItem} from "./mocks";

// Medical ID is an informational category — no report form, just curated
// info plus (the one deliberate exception to "never show contact info to a
// finder") a real emergency-contact call button. This also guards the bug
// fixed alongside this suite: infoFields must read from `details`, or this
// page silently shows nothing an owner filled in.
test("finder sees medical info and can call the emergency contact", async ({page}) => {
  await mockPublicItem(page, {
    name: "Alex Rivera",
    category: "medical",
    details: {
      blood_type: "O negative",
      allergies: "Penicillin",
      emergency_contact_name: "Jordan Rivera",
      emergency_contact_phone: "+15551234567",
    },
  });

  await page.goto("/c/mock-token");

  await expect(page.getByRole("heading", {name: "Alex Rivera"})).toBeVisible();
  await expect(page.getByText("MEDICAL ID")).toBeVisible();
  await expect(page.getByText("O negative")).toBeVisible();
  await expect(page.getByText("Penicillin")).toBeVisible();

  const callButton = page.getByRole("link", {name: /Call emergency contact — Jordan Rivera/});
  await expect(callButton).toBeVisible();
  await expect(callButton).toHaveAttribute("href", "tel:+15551234567");

  // No report flow on an informational category.
  await expect(page.getByRole("button", {name: /Something seems wrong/})).toHaveCount(0);
});

test("shows a plain no-details message when nothing has been filled in", async ({page}) => {
  await mockPublicItem(page, {
    name: "Sam",
    category: "medical",
    details: {},
  });

  await page.goto("/c/mock-token");

  await expect(page.getByText("No additional details have been added yet.")).toBeVisible();
  await expect(page.getByRole("link", {name: /Call emergency contact/})).toHaveCount(0);
});
