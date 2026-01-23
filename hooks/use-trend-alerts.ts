import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface TrendAlert {
  id: string;
  keyword: string;
  category: string | null;
  minMomentum: number;
  minSearchVolume: number;
  isActive: boolean;
  lastTriggered: string | null;
  triggerCount: number;
  createdAt: string;
  updatedAt: string;
}

interface TrendAlertsResponse {
  alerts: TrendAlert[];
}

async function getTrendAlerts(activeOnly: boolean = false): Promise<TrendAlertsResponse> {
  const params = new URLSearchParams();
  if (activeOnly) params.set("activeOnly", "true");
  
  const response = await fetch(`/api/youtube/alerts?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to fetch trend alerts");
  }
  return response.json();
}

async function createTrendAlert(data: {
  keyword: string;
  category?: string;
  minMomentum: number;
  minSearchVolume: number;
}): Promise<{ alert: TrendAlert }> {
  const response = await fetch("/api/youtube/alerts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create trend alert");
  }
  return response.json();
}

async function updateTrendAlert(
  alertId: string,
  data: {
    isActive?: boolean;
    minMomentum?: number;
    minSearchVolume?: number;
  }
): Promise<{ alert: TrendAlert }> {
  const response = await fetch(`/api/youtube/alerts/${alertId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error("Failed to update trend alert");
  }
  return response.json();
}

async function deleteTrendAlert(alertId: string): Promise<{ success: boolean }> {
  const response = await fetch(`/api/youtube/alerts/${alertId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete trend alert");
  }
  return response.json();
}

export function useTrendAlerts(activeOnly: boolean = false) {
  return useQuery({
    queryKey: ["trend-alerts", activeOnly],
    queryFn: () => getTrendAlerts(activeOnly),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useCreateTrendAlert() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createTrendAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trend-alerts"] });
    },
  });
}

export function useUpdateTrendAlert() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ alertId, data }: { alertId: string; data: any }) =>
      updateTrendAlert(alertId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trend-alerts"] });
    },
  });
}

export function useDeleteTrendAlert() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteTrendAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trend-alerts"] });
    },
  });
}
