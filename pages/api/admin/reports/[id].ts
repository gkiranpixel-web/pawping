import {NextApiRequest, NextApiResponse} from "next";
import {clients, requireAdmin} from "../../../../lib/admin";

// Admin moderation for a single finder report — used to remove spam or
// abusive submissions that owners shouldn't have to deal with themselves.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await requireAdmin(req);
    const {adminClient} = clients();
    const {id} = req.query;

    if (req.method === "DELETE") {
      const {error} = await adminClient.from("finder_reports").delete().eq("id", id);
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
