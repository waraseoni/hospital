import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (await supabase.from("profiles").select("role").eq("id", user.id).single()).data?.role;
    if (role !== "admin" && role !== "staff") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const { kind } = body;

    if (kind === "panel") {
      const { code, name, contact = "", notes = "" } = body;
      if (!code || !name) return NextResponse.json({ error: "code and name required" }, { status: 400 });
      const admin = createAdminClient();
      const { data, error } = await admin.from("insurance_panels").insert({ code, name, contact, notes }).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true, panel: data });
    }

    const { code, name, description = "", base_amount = 0, discount_percent = 0, panel_id = null, services = [] } = body;
    if (!code || !name) return NextResponse.json({ error: "code and name required" }, { status: 400 });
    const admin = createAdminClient();
    const { data, error } = await admin.from("packages").insert({
      code, name, description, base_amount, discount_percent, panel_id, services,
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, package: data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const [packages, panels] = await Promise.all([
      admin.from("packages").select("*, panel:insurance_panels(*)").order("name"),
      admin.from("insurance_panels").select("*").order("name"),
    ]);

    return NextResponse.json({
      packages: packages.data || [],
      panels: panels.data || [],
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
