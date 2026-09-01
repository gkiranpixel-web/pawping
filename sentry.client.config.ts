// Runs in the browser. Reports unhandled client-side errors (a crash on
// the public scan page, the owner dashboard, etc.) to Sentry's free
// Developer plan — no source maps, no performance tracing, just "tell me
// when something breaks" at zero added cost or setup complexity.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // 0 = no performance/trace data sent, just error events. Keeps this on
  // the free tier's error-event quota only.
  tracesSampleRate: 0,
});
