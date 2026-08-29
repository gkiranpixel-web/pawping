import {push} from "./webpush";

// Sends a browser push notification to every device an owner has enabled
// alerts on. Deliberately NOT exposed as its own route — call it only from
// server code that has already validated a real event happened (see
// pages/api/report.js). The old /api/notify.js let anyone POST an arbitrary
// cat_id + message and it would push straight to that owner's phone with no
// checks at all; folding this into the validated report path closes that.
export async function notifyOwner(adminClient, {ownerId, title, body, url = "/owner"}) {
  if (!ownerId) return {notified: 0};

  const {data: subs, error} = await adminClient
    .from("push_subscriptions")
    .select("id,endpoint,p256dh,auth")
    .eq("owner_id", ownerId);
  if (error || !subs?.length) return {notified: 0};

  const webpush = push();
  const payload = JSON.stringify({title, body, url});

  let notified = 0;
  await Promise.all(subs.map(async s => {
    try {
      await webpush.sendNotification({endpoint: s.endpoint, keys: {p256dh: s.p256dh, auth: s.auth}}, payload);
      notified++;
    } catch (e) {
      // Subscription is dead (browser uninstalled, permission revoked, etc.) — clean it up.
      if (e.statusCode === 404 || e.statusCode === 410) {
        await adminClient.from("push_subscriptions").delete().eq("id", s.id);
      }
    }
  }));
  return {notified};
}
