import { createClient } from "@/lib/supabase/server";

export async function generateTokenNumber(doctorId: string, dateSlot: string): Promise<number> {
  const supabase = await createClient();

  const dateOnly = dateSlot.split("T")[0];

  const { data, error } = await supabase
    .from("appointments")
    .select("token_no")
    .eq("doctor_id", doctorId)
    .gte("date_slot", `${dateOnly}T00:00:00`)
    .lte("date_slot", `${dateOnly}T23:59:59`)
    .order("token_no", { ascending: false })
    .limit(1);

  if (error) throw new Error("Failed to generate token number");

  return data && data.length > 0 ? data[0].token_no + 1 : 1;
}
