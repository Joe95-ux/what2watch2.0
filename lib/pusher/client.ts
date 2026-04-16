"use client";

import Pusher from "pusher-js";

let pusherClient: Pusher | null = null;

export function isPusherClientConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_PUSHER_KEY && process.env.NEXT_PUBLIC_PUSHER_CLUSTER
  );
}

export function getPusherClient() {
  if (typeof window === "undefined" || !isPusherClientConfigured()) {
    return null;
  }

  if (!pusherClient) {
    pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: "/api/pusher/auth",
    });
  }

  return pusherClient;
}
