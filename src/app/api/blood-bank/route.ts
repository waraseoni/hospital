import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function genUnitCode(group: string) {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `U-${group.replace("+", "P").replace("-", "M")}-${rand}`;
}

function genReqNumber() {
  const d = new Date();
  const date = d.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `BR-${date}-${rand}`;
}

const EXPIRY_DAYS: Record<string, number> = {
  whole: 35, prbc: 42, ffp: 365, platelets: 5, cryo: 365, plasma: 365,
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const kind = request.nextUrl.searchParams.get("kind") || "inventory";
    const admin = createAdminClient();

    if (kind === "donations") {
      const { data, error } = await admin.from("blood_donations").select("*").order("collected_at", { ascending: false }).limit(50);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ donations: data || [] });
    }

    if (kind === "requests") {
      const { data, error } = await admin.from("blood_requests").select("*, patient:patients(name, uhid, blood_group)").order("created_at", { ascending: false }).limit(50);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ requests: data || [] });
    }

    const { data, error } = await admin.from("blood_inventory").select("*").order("expiry_date");
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ units: data || [] });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { kind } = body;
    const admin = createAdminClient();

    if (kind === "donation") {
      const { donor_name, donor_phone = "", donor_age = null, donor_gender = "", blood_group, volume_ml = 350, screened = false, screening_notes = "", create_units = true } = body;
      if (!donor_name || !blood_group) return NextResponse.json({ error: "donor_name and blood_group required" }, { status: 400 });

      const { data: donation, error } = await admin.from("blood_donations").insert({
        donor_name, donor_phone, donor_age, donor_gender, blood_group, volume_ml, screened, screening_notes, created_by: user.id,
      }).select().single();

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });

      if (create_units && screened) {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + (EXPIRY_DAYS.whole || 35));
        await admin.from("blood_inventory").insert({
          donation_id: donation.id,
          blood_group,
          component: "whole",
          unit_code: genUnitCode(blood_group),
          volume_ml,
          expiry_date: expiry.toISOString().split("T")[0],
          status: "available",
        });
      }

      return NextResponse.json({ success: true, donation });
    }

    if (kind === "unit") {
      const { blood_group, component = "whole", volume_ml = 350, expiry_date, location = "Blood Bank" } = body;
      if (!blood_group || !expiry_date) return NextResponse.json({ error: "blood_group and expiry_date required" }, { status: 400 });
      const { data, error } = await admin.from("blood_inventory").insert({
        blood_group, component, unit_code: genUnitCode(blood_group), volume_ml, expiry_date, location,
      }).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true, unit: data });
    }

    if (kind === "request") {
      const { patient_id = null, patient_name = "", blood_group, component = "whole", quantity = 1, urgency = "routine", department = "", notes = "" } = body;
      if (!blood_group) return NextResponse.json({ error: "blood_group required" }, { status: 400 });
      const { data, error } = await admin.from("blood_requests").insert({
        request_number: genReqNumber(),
        patient_id, patient_name, blood_group, component, quantity, urgency, department, notes,
        requested_by: user.id,
      }).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true, request: data });
    }

    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { kind, id, action, unit_ids = [], crossmatch } = body;
    if (!kind || !id || !action) return NextResponse.json({ error: "kind, id, action required" }, { status: 400 });

    const admin = createAdminClient();

    if (kind === "unit") {
      const update: Record<string, unknown> = {};
      if (action === "reserve") update.status = "reserved";
      if (action === "issue") { update.status = "issued"; update.issued_at = new Date().toISOString(); }
      if (action === "discard") update.status = "discarded";
      if (action === "expire") update.status = "expired";
      const { data, error } = await admin.from("blood_inventory").update(update).eq("id", id).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true, unit: data });
    }

    if (kind === "request") {
      const { data: req } = await admin.from("blood_requests").select("*").eq("id", id).single();
      if (!req) return NextResponse.json({ error: "Request not found" }, { status: 404 });

      let update: Record<string, unknown> = {};
      if (action === "approve") {
        update = { status: "approved", approved_by: user.id, crossmatch: crossmatch || "pending" };
      } else if (action === "reject") {
        update = { status: "rejected", approved_by: user.id };
      } else if (action === "issue") {
        if (!unit_ids.length) return NextResponse.json({ error: "unit_ids required" }, { status: 400 });
        for (const uid of unit_ids) {
          await admin.from("blood_inventory").update({ status: "issued", issued_at: new Date().toISOString() }).eq("id", uid);
        }
        update = { status: "issued", issued_unit_ids: unit_ids, issued_at: new Date().toISOString(), crossmatch: crossmatch || "compatible", approved_by: user.id };
      } else {
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
      }

      const { data, error } = await admin.from("blood_requests").update(update).eq("id", id).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true, request: data });
    }

    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
