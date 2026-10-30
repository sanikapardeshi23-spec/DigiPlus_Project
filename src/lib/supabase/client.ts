import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  if (typeof window !== "undefined") {
    // Client-side info
    logger.info("Supabase client initialized with mock/placeholder credentials. Connect Supabase in .env.local to persist remotely.");
  }
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder-project.supabase.co",
  supabaseAnonKey || "placeholder-anon-key"
);

export function getBrowserSupabase() {
  return supabase;
}
