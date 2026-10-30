import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

export function getServerSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseServiceKey) {
    logger.warn("Supabase Server credentials missing from environment. Using fallback client.");
  }

  return createClient(
    supabaseUrl || "https://placeholder-project.supabase.co",
    supabaseServiceKey || "placeholder-key",
    {
      auth: {
        persistSession: false,
      },
    }
  );
}

