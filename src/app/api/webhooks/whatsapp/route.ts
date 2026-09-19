import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { MessageSid, MessageStatus, To } = body;

    if (!MessageSid) {
      return NextResponse.json({ error: "Missing MessageSid" }, { status: 400 });
    }

    const supabase = await createClient();

    const updateData: Record<string, unknown> = {};

    if (MessageStatus === "delivered") {
      updateData.status = "delivered";
      updateData.delivered_at = new Date().toISOString();
    } else if (MessageStatus === "failed") {
      updateData.status = "failed";
      updateData.error_message = body.ErrorCode || "Delivery failed";
    } else if (MessageStatus === "sent") {
      updateData.status = "sent";
    }

    const { error } = await supabase
      .from("whatsapp_logs")
      .update(updateData)
      .eq("external_message_id", MessageSid);

    if (error) {
      console.error("Webhook update error:", error);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
