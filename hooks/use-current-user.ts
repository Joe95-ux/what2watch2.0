import { useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";

export function useCurrentUser() {
  const { user: clerkUser, isLoaded } = useUser();

  return useQuery({
    queryKey: ["current-user", clerkUser?.id],
    queryFn: async () => {
      if (!clerkUser?.id) return null;
      const response = await fetch("/api/users/me");
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      return data.user;
    },
    enabled: isLoaded && !!clerkUser?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

