import {defineConfig, devices} from "@playwright/test";

// End-to-end tests for the pages a finder actually lands on. These never
// touch a real Supabase project: every test mocks the Supabase REST call
// and the /api/report POST at the network layer (see e2e/*.spec.ts), so
// this suite is safe to run against placeholder credentials, on any
// machine, with zero external dependencies or secrets.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "on-first-retry",
    // The report flow asks for location — grant it up front with a fixed
    // point so the "send location to owner" step is deterministic.
    permissions: ["geolocation"],
    geolocation: {latitude: 37.7749, longitude: -122.4194},
  },
  projects: [
    {name: "chromium", use: {...devices["Desktop Chrome"]}},
  ],
  webServer: {
    command: "npm run dev -- -p 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      // Any syntactically valid values work: every test intercepts the
      // Supabase call before it reaches the network (see e2e/mocks.ts).
      NEXT_PUBLIC_SUPABASE_URL: "https://placeholder.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "placeholder-anon-key",
    },
  },
});
