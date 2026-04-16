import { NextResponse } from "next/server";
import { isBeamsConfigured } from "@/lib/pusher/beams-server";

export async function GET() {
  if (!isBeamsConfigured()) {
    return NextResponse.json({ configured: false, instanceId: null }, { status: 503 });
  }

  return NextResponse.json({
    configured: true,
    instanceId: process.env.PUSHER_BEAMS_INSTANCE_ID || null,
  });
}
