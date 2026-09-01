import {createClient, SupabaseClient} from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const ready: boolean = Boolean(url && key);
export const supabase: SupabaseClient | null = ready ? createClient(url as string, key as string) : null;
