import {NextApiRequest, NextApiResponse} from "next";
import {clients, requireAdmin} from "../../../../lib/admin";
import {getCategory} from "../../../../lib/categories";

interface CatPatch {
  status?: string;
  status_changed_at?: string;
  owner_id?: string;
}

// Admin moderation for a single pet: change status, reassign owner by
// email, or remove the pet entirely. Uses the service-role client, so it
// bypasses row-level security by design — access is gated by requireAdmin.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await requireAdmin(req);
    const {adminClient} = clients();
    const {id} = req.query;

    if (req.method === "PATCH") {
      const {status, owner_email} = req.body || {};
      const patch: CatPatch = {};
      if (status) {
        if (!["safe", "missing"].includes(status)) return res.status(400).json({error: "Invalid status"});
        // "Missing" only means something for a findable category (pet,
        // item) — the owner form doesn't even offer the control for
        // property/medical (see lib/categories.ts), so block it here too
        // rather than let the admin API silently accept it. Reverting to
        // "safe" is always allowed, including to clean up a stray
        // "missing" set before this guard existed.
        if (status === "missing") {
          const {data: existing, error: existingError} = await adminClient.from("cats").select("category").eq("id", id).maybeSingle();
          if (existingError) throw existingError;
          if (!existing) return res.status(404).json({error: "Pet not found"});
          if (!getCategory(existing.category).hasReportFlow) {
            return res.status(400).json({error: "This category doesn't support a missing/safe status."});
          }
        }
        patch.status = status;
        patch.status_changed_at = new Date().toISOString();
      }
      if (owner_email) {
        const email = String(owner_email).trim().toLowerCase();
        const {data: list, error: listError} = await adminClient.auth.admin.listUsers({page: 1, perPage: 1000});
        if (listError) throw listError;
        const user = list.users.find(u => u.email?.toLowerCase() === email);
        if (!user) return res.status(404).json({error: "No user with that email"});
        patch.owner_id = user.id;
      }
      if (!Object.keys(patch).length) return res.status(400).json({error: "Nothing to update"});
      const {data, error} = await adminClient.from("cats").update(patch).eq("id", id).select().maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({error: "Pet not found"});
      return res.status(200).json({cat: data});
    }

    if (req.method === "DELETE") {
      const {error} = await adminClient.from("cats").delete().eq("id", id);
      if (error) throw error;
      return res.status(200).json({ok: true});
    }

    return res.status(405).json({error: "Method not allowed"});
  } catch (e) {
    const message = e instanceof Error ? e.message : "Something went wrong";
    const status = message === "Forbidden" ? 403 : message === "Unauthorized" ? 401 : 500;
    res.status(status).json({error: message});
  }
}
