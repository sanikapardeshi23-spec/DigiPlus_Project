import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";

function isValidHttpUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export const isSupabaseConfigured = Boolean(
  rawUrl &&
    isValidHttpUrl(rawUrl) &&
    rawAnonKey &&
    rawUrl !== "https://your-project-id.supabase.co" &&
    rawAnonKey !== "your-supabase-anon-key"
);

if (!isSupabaseConfigured && typeof window !== "undefined") {
  logger.info(
    "Supabase credentials not configured in NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. Please provide them in .env.local for permanent database storage."
  );
}

const safeUrl = isSupabaseConfigured ? rawUrl : "https://placeholder-project.supabase.co";
const safeKey = isSupabaseConfigured ? rawAnonKey : "placeholder-anon-key";

export const supabase = createClient(safeUrl, safeKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export function getBrowserSupabase() {
  return supabase;
}
