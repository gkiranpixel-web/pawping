import {clients} from "../../lib/admin";
import {notifyOwner} from "../../lib/notify";

// The only way a finder_report gets created. The database no longer accepts
// a direct anonymous insert (see the v11 migration) — everything goes
// through here, server-side, using the service-role key that never reaches
// a browser. That closes two real gaps: unlimited/unvalidated inserts sent
// straight to Supabase's REST API, and the old /api/notify route, which let
// anyone push an arbitrary message to any owner's phone for any cat_id with
// no proof a sighting ever happened.
const MAX_MESSAGE_LENGTH = 500;
const MIN_SECONDS_ON_PAGE = 2; // a real person takes at least this long; a script submits instantly

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({error: "Method not allowed"});
  const {token, message, report_type, latitude, longitude, accuracy_m, hp, started_at} = req.body || {};

  // Honeypot: a field real visitors never see or fill in (hidden off-screen
  // in the form). A bot that fills every field trips this — pretend to
  // succeed rather than hinting at what gave it away.
  if (hp) return res.status(200).json({ok: true});

  // Timing check: catches scripted submissions that POST immediately without
  // the page ever actually rendering in a browser.
  if (started_at && Date.now() - Number(started_at) < MIN_SECONDS_ON_PAGE * 1000) {
    return res.status(200).json({ok: true});
  }

  if (!token || typeof token !== "string") return res.status(400).json({error: "Missing token"});
  if (!["saw", "have"].includes(report_type)) return res.status(400).json({error: "Invalid report type"});

  const trimmedMessage = typeof message === "string" && message.trim() ? message.trim().slice(0, MAX_MESSAGE_LENGTH) : null;
  const lat = latitude != null ? Number(latitude) : null;
  const lng = longitude != null ? Number(longitude) : null;
  if (lat != null && (Number.isNaN(lat) || lat < -90 || lat > 90)) return res.status(400).json({error: "Invalid latitude"});
  if (lng != null && (Number.isNaN(lng) || lng < -180 || lng > 180)) return res.status(400).json({error: "Invalid longitude"});

  try {
    const {adminClient} = clients();

    const {data: cat, error: catError} = await adminClient
      .from("cats")
      .select("id,name,owner_id")
      .eq("public_token", token)
      .maybeSingle();
    if (catError) throw catError;
    if (!cat) return res.status(404).json({error: "Pet not found"});

    const {error: insertError} = await adminClient.from("finder_reports").insert({
      cat_id: cat.id,
      latitude: lat,
      longitude: lng,
      accuracy_m: accuracy_m != null ? Number(accuracy_m) : null,
      message: trimmedMessage,
      report_type,
    });
    if (insertError) {
      // The database's own rate-limit and validation trigger raise here too
      // (max 5 reports per pet per 10 minutes) — its message is already
      // written for a finder to read, so just pass it through.
      return res.status(429).json({error: insertError.message});
    }

    let notified = 0;
    if (cat.owner_id) {
      const title = report_type === "have" ? `Someone has ${cat.name} safe!` : `${cat.name} was just spotted`;
      const body = trimmedMessage || "Open PawPing to see the sighting.";
      ({notified} = await notifyOwner(adminClient, {ownerId: cat.owner_id, title, body}));
    }

    res.status(200).json({ok: true, notified});
  } catch (e) {
    res.status(500).json({error: "Something went wrong. Please try again."});
  }
}
