import webpush from "web-push";

let configured = false;

// Lazily configure the web-push library with this project's VAPID keys.
// Throws a clear error if they haven't been set yet, instead of a cryptic
// failure deep inside the push send.
export function push() {
  if (!configured) {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || "mailto:support@example.com";
    if (!publicKey || !privateKey) {
      throw new Error("VAPID keys are missing. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.");
    }
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  }
  return webpush;
}
