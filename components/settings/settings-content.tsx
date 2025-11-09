"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, User, Palette, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface SettingsContentProps {
  user: {
    id: string;
    email: string;
    displayName: string | null;
    username: string | null;
  };
  preferences: {
    favoriteGenres: number[];
    onboardingCompleted: boolean;
  } | null;
}

export default function SettingsContent({ user, preferences }: SettingsContentProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleStartOnboarding = async () => {
    setIsLoading(true);
    try {
      // Reset onboarding status
      await fetch("/api/user/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          favoriteGenres: [],
          onboardingCompleted: false,
        }),
      });
      router.push("/onboarding");
    } catch (error) {
      console.error("Error resetting onboarding:", error);
      toast.error("Failed to start onboarding");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <div className="space-y-6">
        {/* Account Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              <CardTitle>Account</CardTitle>
            </div>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            {user.displayName && (
              <div>
                <label className="text-sm font-medium">Display Name</label>
                <p className="text-sm text-muted-foreground">{user.displayName}</p>
              </div>
            )}
            {user.username && (
              <div>
                <label className="text-sm font-medium">Username</label>
                <p className="text-sm text-muted-foreground">{user.username}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              <CardTitle>Preferences</CardTitle>
            </div>
            <CardDescription>Customize your experience</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Personalization
                </label>
                <p className="text-sm text-muted-foreground mb-4">
                  {preferences?.onboardingCompleted
                    ? "You've completed onboarding. You can restart it to update your preferences."
                    : "Complete onboarding to get personalized recommendations."}
                </p>
                <Button
                  onClick={handleStartOnboarding}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {preferences?.onboardingCompleted
                    ? "Update Preferences"
                    : "Start Onboarding"}
                </Button>
              </div>
              {preferences && preferences.favoriteGenres.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Favorite Genres
                  </label>
                  <p className="text-sm text-muted-foreground">
                    {preferences.favoriteGenres.length} genre
                    {preferences.favoriteGenres.length !== 1 ? "s" : ""} selected
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

