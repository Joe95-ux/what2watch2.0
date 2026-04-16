"use client";

import { usePusherBeams } from "@/hooks/use-pusher-beams";

export function PusherBeamsProvider() {
  usePusherBeams();
  return null;
}
