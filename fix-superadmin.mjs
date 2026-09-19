import { readFileSync } from "fs";
import { Client } from "pg";

const env = readFileSync(".env.local", "utf-8");
const get = (key) => env.match(new RegExp(key + "=(.+)"))?.[1]?.trim();
const SUPABASE_URL = get("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_ROLE_KEY = get("SUPABASE_SERVICE_ROLE_KEY");
const projectRef = SUPABASE_URL?.match(/https:\/\/(.+)\.supabase\.co/)?.[1];
console.log("Project ref:", projectRef);

async function main() {
  const mgmtUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/connection-info`;
  const res = await fetch(mgmtUrl, {
    headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
  });
  const data = await res.json();
  console.log("Connection info received:", { host: data.host, port: data.port, database: data.database, user: data.user });

  const { host, port, database, user, password } = data;
  if (!password) { console.error("No password"); process.exit(1); }

  const client = new Client({ host, port, database, user, password });
  await client.connect();
  console.log("Connected to database!");

  const sql = readFileSync("supabase/migrations/00015_add_super_admin_role.sql", "utf-8");
  // Execute ALTER TYPE separately first since it can't be in a transaction
  const alterMatch = sql.match(/ALTER TYPE[^;]+;/);
  if (alterMatch) {
    console.log("Running ALTER TYPE...");
    await client.query(alterMatch[0]);
    console.log("ALTER TYPE done!");
  }

  // Execute the rest (DROP/CREATE POLICY statements)
  const rest = sql.replace(alterMatch[0], "").trim();
  if (rest) {
    console.log("Running remaining policies...");
    await client.query(rest);
    console.log("Policies done!");
  }

  console.log("Migration executed successfully!");
  await client.end();
  console.log("Done!");
}

main().catch(e => { console.error(e.message); console.error(e.stack); process.exit(1); });
