// Runs in Next.js's server process (SSR, API routes like /api/report).
// Same minimal setup as sentry.client.config.ts — see that file for why.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
});
