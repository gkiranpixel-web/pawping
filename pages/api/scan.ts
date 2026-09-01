import {NextApiRequest, NextApiResponse} from "next";
import {clients} from "../../lib/admin";

// Logs an anonymous scan of a public tag page — just enough for an owner
// to get a rough sense of where/when their tag gets scanned, without
// storing anything that identifies the finder. No IP address is read or
// stored; city/region/country come from Vercel's edge geo headers, which
// are added automatically on Vercel's platform at no extra cost (no
// external geo-IP service, no API key, nothing to pay for).
//
// Like /api/report, this goes through the service-role key server-side —
// scan_events has no anon/authenticated INSERT policy (see the v17
// migration), so a direct client-side insert would be rejected by RLS
// even if someone tried.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({error: "Method not allowed"});
  const {token} = req.body || {};
  if (!token || typeof token !== "string") return res.status(400).json({error: "Missing token"});

  try {
    const {adminClient} = clients();

    const {data: cat, error: catError} = await adminClient
      .from("cats")
      .select("id")
      .eq("public_token", token)
      .maybeSingle();
    if (catError) throw catError;
    // Silently succeed on an unknown token — this is a passive log, not
    // something a finder needs an error message about.
    if (!cat) return res.status(200).json({ok: true});

    const city = decodeHeader(req.headers["x-vercel-ip-city"]);
    const region = decodeHeader(req.headers["x-vercel-ip-country-region"]);
    const country = decodeHeader(req.headers["x-vercel-ip-country"]);

    await adminClient.from("scan_events").insert({cat_id: cat.id, city, region, country});

    res.status(200).json({ok: true});
  } catch (e) {
    // Never let a logging failure surface to the finder — this is a
    // best-effort side channel, not part of the core scan experience.
    res.status(200).json({ok: false});
  }
}

// Vercel's geo headers are URL-encoded (city names can contain spaces/
// accents) and may arrive as a string or a string[] depending on the
// runtime; normalize both away.
function decodeHeader(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
