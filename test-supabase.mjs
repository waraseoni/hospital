import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf-8");
const get = (key) => env.match(new RegExp(key + "=(.+)"))?.[1]?.trim();
const url = get("NEXT_PUBLIC_SUPABASE_URL");
const key = get("SUPABASE_SERVICE_ROLE_KEY");
const client = createClient(url, key);

async function test() {
  console.log("Testing Supabase client connection...");
  try {
    const { data, error } = await client.auth.getSession();
    console.log("Session:", data ? "exists" : "null", error?.message);
    
    const { data: d1 } = await client.rpc("current_setting", { setting_name: "server_version" });
    console.log("Server version:", d1);
  } catch(e) {
    console.error("Error:", e.message);
  }
}
test();
