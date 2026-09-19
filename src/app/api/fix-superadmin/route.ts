import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/client";

export async function GET(request: NextRequest) {
  try {
    const admin = createAdminClient();
    const anon = createClient();
    const userEmail = "vikram@hms.com";

    // List all profiles (admin bypasses RLS)
    const { data: allProfiles, error: adminErr } = await admin
      .from("profiles")
      .select("*");

    // Find the user
    const { data: authUsers } = await admin.auth.admin.listUsers();
    const user = authUsers?.users?.find(u => u.email === userEmail);

    // Fix the profile role using admin client (bypasses RLS)
    let fixResult = null;
    if (user) {
      const { data: fixed, error: fixErr } = await admin
        .from("profiles")
        .update({ role: "super_admin" })
        .eq("id", user.id)
        .select()
        .single();
      fixResult = { fixed, error: fixErr?.message };
    }

    // Also try updating the auth user metadata
    let metaFix = null;
    if (user) {
      const { data: metaFixed, error: metaErr } = await admin.auth.admin.updateUserById(
        user.id,
        { user_metadata: { role: "super_admin" } }
      );
      metaFix = { data: metaFixed, error: metaErr?.message };
    }

    // Query profile with anon client to see if RLS allows it
    let anonResult = null;
    if (user) {
      const { data: profile, error } = await anon
        .from("profiles")
        .select("id, role, full_name")
        .eq("id", user.id)
        .single();
      anonResult = { data: profile, error: error?.message };
    }

    return NextResponse.json({
      authUser: user ? { id: user.id, email: user.email, role: user.user_metadata?.role, email_confirmed_at: user.email_confirmed_at } : null,
      allProfiles: allProfiles?.map(p => ({ id: p.id, email: p.email, role: p.role })),
      fixResult,
      metaFix,
      anonResult,
    });
  } catch(e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
