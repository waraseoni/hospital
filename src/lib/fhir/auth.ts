import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function requireFhirAuth(
  request: NextRequest
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  // Allow a static FHIR token via env (machine-to-machine interop)
  const fhirToken = process.env.FHIR_API_TOKEN;
  if (fhirToken) {
    const auth = request.headers.get("authorization");
    const apiKey = request.headers.get("x-api-key");
    if (auth === `Bearer ${fhirToken}` || apiKey === fhirToken) {
      return { ok: true };
    }
  }

  // Fallback: require an authenticated admin / super_admin user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true };
}