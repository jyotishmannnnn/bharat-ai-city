import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Guard: if env vars aren't set (e.g. local dev before Supabase project is
// created), export a flag instead of throwing so the rest of the app keeps
// working with an empty/local-only leaderboard.
export const supabaseEnabled = Boolean(url && anonKey);

export const supabase = supabaseEnabled ? createClient(url, anonKey) : null;
