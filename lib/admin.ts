import {createClient, SupabaseClient} from "@supabase/supabase-js";

export interface AdminClients {
  authClient: SupabaseClient;
  adminClient: SupabaseClient;
}

export function clients(): AdminClients {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !secret) throw new Error("Admin server variables are missing");
  return {
    authClient: createClient(url, anon, {auth: {persistSession: false, autoRefreshToken: false}}),
    adminClient: createClient(url, secret, {auth: {persistSession: false, autoRefreshToken: false}}),
  };
}

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAIL || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
}

// Minimal shape we need from a Next.js API request — avoids pulling in the
// full `next` request type just for one header read.
export interface AuthorizableRequest {
  headers: {authorization?: string};
}

export async function requireAdmin(req: AuthorizableRequest) {
  const token = (req.headers.authorization || "").replace(/^Bearer /, "");
  if (!token) throw new Error("Unauthorized");
  const {authClient} = clients();
  const {data, error} = await authClient.auth.getUser(token);
  if (error || !data.user) throw new Error("Unauthorized");
  const allowed = adminEmails();
  const email = data.user.email?.toLowerCase();
  if (!allowed.length || !email || !allowed.includes(email)) throw new Error("Forbidden");
  return data.user;
}
