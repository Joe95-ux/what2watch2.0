"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";

interface AvatarContextType {
  avatarUrl: string | null;
  updateAvatar: (url: string) => void;
}

const AvatarContext = createContext<AvatarContextType | undefined>(undefined);

export function AvatarProvider({ children }: { children: ReactNode }) {
  const { data: currentUser } = useCurrentUser();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser?.avatarUrl) {
      setAvatarUrl(currentUser.avatarUrl);
    }
  }, [currentUser?.avatarUrl]);

  const updateAvatar = (url: string) => {
    setAvatarUrl(url);
  };

  return (
    <AvatarContext.Provider value={{ avatarUrl, updateAvatar }}>
      {children}
    </AvatarContext.Provider>
  );
}

export function useAvatar() {
  const context = useContext(AvatarContext);
  if (context === undefined) {
    throw new Error("useAvatar must be used within AvatarProvider");
  }
  return context;
}

