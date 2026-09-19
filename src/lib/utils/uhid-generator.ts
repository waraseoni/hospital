import { createClient } from "@/lib/supabase/server";

export async function generateUHID(): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("patients")
    .select("uhid")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw new Error("Failed to generate UHID");

  const year = new Date().getFullYear();
  let sequence = 1;

  if (data && data.length > 0) {
    const lastUHID = data[0].uhid;
    const lastYear = lastUHID.substring(0, 4);
    const lastSeq = parseInt(lastUHID.substring(5), 10);

    if (lastYear === String(year)) {
      sequence = lastSeq + 1;
    }
  }

  return `${year}-${String(sequence).padStart(6, "0")}`;
}
