"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/use-current-user";
import { getBeamsClient, PusherPushNotifications } from "@/lib/pusher/beams-client";

export function usePusherBeams() {
  const { data: currentUser } = useCurrentUser();
  const { data: beamsConfig } = useQuery({
    queryKey: ["beams-config"],
    queryFn: async () => {
      const response = await fetch("/api/pusher/beams-config");
      if (!response.ok) return null;
      return (await response.json()) as { configured: boolean; instanceId: string | null };
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (!beamsConfig?.instanceId) return;

    const beamsClient = getBeamsClient(beamsConfig.instanceId);
    if (!beamsClient) return;

    let cancelled = false;

    const syncBeamsState = async () => {
      try {
        if (!currentUser?.id || currentUser.pushNotifications === false) {
          await beamsClient.clearAllState();
          return;
        }

        const registrationState = await beamsClient.getRegistrationState();
        if (
          registrationState ===
          PusherPushNotifications.RegistrationState.PERMISSION_DENIED
        ) {
          return;
        }

        await beamsClient.start();
        if (cancelled) return;

        const tokenProvider = new PusherPushNotifications.TokenProvider({
          url: "/api/pusher/beams-auth",
          credentials: "same-origin",
        });

        const currentBeamsUserId = await beamsClient.getUserId();
        if (currentBeamsUserId !== currentUser.id) {
          await beamsClient.setUserId(currentUser.id, tokenProvider);
        }
      } catch (error) {
        console.error("[Beams] Failed to sync browser state:", error);
      }
    };

    void syncBeamsState();

    return () => {
      cancelled = true;
    };
  }, [beamsConfig?.instanceId, currentUser?.id, currentUser?.pushNotifications]);
}
