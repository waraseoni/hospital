import { createClient } from "@/lib/supabase/client";

export interface Settings {
  id: string;
  hospital_name: string;
  hospital_address: string;
  hospital_phone: string;
  hospital_email: string;
  hospital_gstin: string;
  logo_url: string;
  tax_rate: number;
  receipt_footer: string;
  whatsapp_number: string;
  upi_id: string;
  currency: string;
  updated_at: string;
}

let cachedSettings: Settings | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60_000; // 60 seconds

export async function getSettings(): Promise<Settings> {
  const now = Date.now();
  if (cachedSettings && now - cacheTimestamp < CACHE_TTL) {
    return cachedSettings;
  }

  const supabase = createClient();
  const { data } = await supabase.from("settings").select("*").limit(1).single();
  if (data) {
    cachedSettings = data;
    cacheTimestamp = now;
  }
  return data as Settings;
}

export function clearSettingsCache() {
  cachedSettings = null;
  cacheTimestamp = 0;
}
