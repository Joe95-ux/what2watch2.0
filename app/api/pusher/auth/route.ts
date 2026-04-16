import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getPusherServer, isPusherServerConfigured } from "@/lib/pusher/server";
import { getUserChannelName } from "@/lib/pusher/channels";

async function parseAuthBody(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return request.json();
  }

  const text = await request.text();
  const form = new URLSearchParams(text);

  return {
    socket_id: form.get("socket_id"),
    channel_name: form.get("channel_name"),
  };
}

export async function POST(request: NextRequest) {
  try {
    if (!isPusherServerConfigured()) {
      return NextResponse.json({ error: "Pusher is not configured" }, { status: 503 });
    }

    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { socket_id: socketId, channel_name: channelName } = await parseAuthBody(request);

    if (!socketId || !channelName) {
      return NextResponse.json({ error: "Missing socket_id or channel_name" }, { status: 400 });
    }

    if (channelName !== getUserChannelName(user.id)) {
      return NextResponse.json({ error: "Forbidden channel" }, { status: 403 });
    }

    const authResponse = getPusherServer().authorizeChannel(socketId, channelName);
    return NextResponse.json(authResponse);
  } catch (error) {
    console.error("[PusherAuth] Failed to authorize channel:", error);
    return NextResponse.json({ error: "Failed to authorize channel" }, { status: 500 });
  }
}
