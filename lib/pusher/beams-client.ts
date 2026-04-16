"use client";

import * as PusherPushNotifications from "@pusher/push-notifications-web";

let beamsClient: PusherPushNotifications.Client | null = null;
let beamsInstanceId: string | null = null;

export function getBeamsClient(instanceId: string | null) {
  if (typeof window === "undefined" || !instanceId) {
    return null;
  }

  if (!beamsClient || beamsInstanceId !== instanceId) {
    beamsClient = new PusherPushNotifications.Client({
      instanceId,
    });
    beamsInstanceId = instanceId;
  }

  return beamsClient;
}

export { PusherPushNotifications };
