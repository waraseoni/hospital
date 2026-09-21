import { createClient } from "@/lib/supabase/server";
import type { Settings } from "./index";

let cachedSettings: Settings | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60_000;

export async function getSettingsServer(): Promise<Settings> {
  const now = Date.now();
  if (cachedSettings && now - cacheTimestamp < CACHE_TTL) {
    return cachedSettings;
  }

  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("*").limit(1).single();
  if (data) {
    cachedSettings = data;
    cacheTimestamp = now;
  }
  return data as Settings;
}
