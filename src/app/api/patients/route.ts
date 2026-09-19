import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateUHID } from "@/lib/utils/uhid-generator";

export async function POST(request: NextRequest) {
  try {
    const { name, dob, gender, phone, address, blood_group, emergency_contact, allergies } = await request.json();

    if (!name || !dob || !gender) {
      return NextResponse.json({ error: "Name, dob, and gender are required" }, { status: 400 });
    }

    const admin = createAdminClient();
    const uhid = await generateUHID();

    const { data, error } = await admin.from("patients").insert({
      uhid,
      name,
      dob,
      gender,
      phone: phone || "",
      address: address || "",
      blood_group: blood_group || null,
      emergency_contact: emergency_contact || null,
      allergies: allergies || null,
    }).select().single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Patient created successfully", patient: data });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
