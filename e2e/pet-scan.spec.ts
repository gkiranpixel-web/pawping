import {expect, test} from "@playwright/test";
import {mockPublicItem, mockReportEndpoint} from "./mocks";

// The most important journey in the app: a stranger scans a QR tag, sees
// enough to trust the page, and — if something's wrong — can tell the
// owner without ever seeing the owner's contact info.
test("finder can view a pet's profile and report a sighting", async ({page}) => {
  await mockPublicItem(page, {
    name: "Milo",
    category: "pet",
    status: "safe",
    color: "Tabby",
    age: "3 years",
  });
  await mockReportEndpoint(page);

  await page.goto("/c/mock-token");

  await expect(page.getByRole("heading", {name: "Say hello to Milo!"})).toBeVisible();
  await expect(page.getByText("Tabby")).toBeVisible();
  await expect(page.getByText("3 years")).toBeVisible();

  await page.getByRole("button", {name: /Something seems wrong/}).click();

  await page.getByLabel("What's the situation?").selectOption("have");
  await page.getByPlaceholder(/Where did you see it/).fill("Found near the park entrance");

  await page.getByRole("button", {name: /Send this to the owner/}).click();

  await expect(page.getByText("Thank you. The owner can now see this and has been notified.")).toBeVisible();
});

test("shows the report form immediately for a missing pet", async ({page}) => {
  await mockPublicItem(page, {
    name: "Rex",
    category: "pet",
    status: "missing",
  });

  await page.goto("/c/mock-token");

  await expect(page.getByRole("heading", {name: "Rex needs to get home"})).toBeVisible();
  // No need to click "something seems wrong" first — a missing pet's report
  // form is already open.
  await expect(page.getByLabel("What's the situation?")).toBeVisible();
});

test("shows a clear message for an unknown token", async ({page}) => {
  await page.route("**/rest/v1/rpc/get_public_item", route =>
    route.fulfill({status: 200, contentType: "application/json", body: "[]"})
  );

  await page.goto("/c/does-not-exist");

  await expect(page.getByRole("heading", {name: "Not found"})).toBeVisible();
});
