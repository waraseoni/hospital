import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = await createClient();

    const changes = body?.entry?.[0]?.changes?.[0]?.value;
    const statuses: Array<{
      id?: string;
      status?: string;
      errors?: Array<{ title?: string }>;
    }> = changes?.statuses ?? [];

    for (const status of statuses) {
      const wamid = status.id;
      if (!wamid) continue;

      const updateData: Record<string, unknown> = {};

      switch (status.status) {
        case "sent":
          updateData.status = "sent";
          break;
        case "delivered":
          updateData.status = "delivered";
          updateData.delivered_at = new Date().toISOString();
          break;
        case "failed":
          updateData.status = "failed";
          updateData.error_message = status.errors?.[0]?.title || "Delivery failed";
          break;
        default:
          continue;
      }

      const { error } = await supabase
        .from("whatsapp_logs")
        .update(updateData)
        .eq("external_message_id", wamid);

      if (error) {
        console.error("Webhook update error:", error);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}