import {NextApiRequest, NextApiResponse} from "next";
import {clients, requireAdmin} from "../../../lib/admin";
import {getCategory} from "../../../lib/categories";

interface CatRow {
  id: string;
  name: string;
  category: string;
  status: string;
  status_changed_at: string;
  owner_id: string | null;
  created_at: string;
}

interface FinderReportRow {
  id: string;
  cat_id: string;
  message: string | null;
  accuracy_m: number | null;
  resolved_at: string | null;
  created_at: string;
  latitude?: number | null;
  longitude?: number | null;
  cats?: {name: string; owner_id: string | null} | null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({error: "Method not allowed"});
  try {
    await requireAdmin(req);
    const {adminClient} = clients();

    const [usersResult, catsResult, reportsResult, unresolvedResult] = await Promise.all([
      adminClient.auth.admin.listUsers({page: 1, perPage: 1000}),
      adminClient.from("cats").select("id,name,category,status,status_changed_at,owner_id,created_at").order("created_at", {ascending: false}),
      adminClient.from("finder_reports").select("id,cat_id,message,accuracy_m,resolved_at,created_at,cats(name,owner_id)").order("created_at", {ascending: false}).limit(200),
      adminClient.from("finder_reports").select("id", {count: "exact", head: true}).is("resolved_at", null),
    ]);
    if (usersResult.error || catsResult.error || reportsResult.error || unresolvedResult.error) {
      throw (usersResult.error || catsResult.error || reportsResult.error || unresolvedResult.error);
    }

    const users = usersResult.data.users.map(u => ({id: u.id, email: u.email || "", created_at: u.created_at, last_sign_in_at: u.last_sign_in_at}));
    const emails: Record<string, string> = Object.fromEntries(users.map(u => [u.id, u.email]));

    const cats = ((catsResult.data || []) as CatRow[]).map(c => ({...c, owner_email: emails[c.owner_id || ""] || "Unassigned"}));
    const reports = ((reportsResult.data || []) as unknown as FinderReportRow[]).map(r => ({...r, owner_email: emails[r.cats?.owner_id || ""] || "Unassigned", pet_name: r.cats?.name || "Pet"}));

    // Missing pets need their latest known location. Fetch it directly for
    // just those cats rather than relying on the capped recent-reports list
    // above, so a pet missing for weeks still shows its last sighting.
    //
    // "Missing" only ever means anything for a findable category (pet,
    // item) — property/rental tags and medical IDs never had a way to
    // set it in the first place (the owner form hides that control for
    // them, see lib/categories.ts's CATEGORIES[key].hasReportFlow), but a
    // stray "missing" status on one — from before that fix, or a future
    // admin edit — shouldn't surface here as if it meant something.
    const missingCats = cats.filter(c => c.status === "missing" && getCategory(c.category).hasReportFlow);
    const lastReportByCat: Record<string, FinderReportRow> = {};
    if (missingCats.length) {
      const {data: missingReports, error: missingError} = await adminClient
        .from("finder_reports")
        .select("cat_id,latitude,longitude,message,created_at")
        .in("cat_id", missingCats.map(c => c.id))
        .order("created_at", {ascending: false});
      if (missingError) throw missingError;
      for (const r of (missingReports || []) as FinderReportRow[]) {
        if (!lastReportByCat[r.cat_id]) lastReportByCat[r.cat_id] = r;
      }
    }
    const missing = missingCats
      .map(c => ({id: c.id, name: c.name, owner_email: c.owner_email, missing_since: c.status_changed_at, last_report: lastReportByCat[c.id] || null}))
      .sort((a, b) => new Date(a.missing_since).getTime() - new Date(b.missing_since).getTime());

    res.status(200).json({
      stats: {
        users: users.length,
        cats: cats.length,
        reports: reports.length,
        missing: missingCats.length,
        unresolved: unresolvedResult.count || 0,
      },
      users, cats, reports, missing,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Something went wrong";
    const status = message === "Forbidden" ? 403 : message === "Unauthorized" ? 401 : 500;
    res.status(status).json({error: message});
  }
}
