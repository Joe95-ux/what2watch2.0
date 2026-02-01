"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { useQueryClient } from "@tanstack/react-query";
import { useUser, useReverification } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Settings, 
  UserRound, 
  Palette, 
  Sparkles, 
  Lock, 
  Eye, 
  Users, 
  Star, 
  FileText, 
  List, 
  Music, 
  Film, 
  Heart, 
  UserRoundPlus,
  Bell,
  Moon,
  Sun,
  Monitor,
  Mail,
  MessageSquare,
  ThumbsUp,
  AtSign,
  CheckCircle2,
  LayoutGrid,
  Link2
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SettingsLinksSection } from "@/components/settings/settings-links-section";

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
  activitySettings: {
    activityVisibility: string;
    showRatingsInActivity: boolean;
    showReviewsInActivity: boolean;
    showListsInActivity: boolean;
    showPlaylistsInActivity: boolean;
    showWatchedInActivity: boolean;
    showLikedInActivity: boolean;
    showFollowedInActivity: boolean;
  };
  notificationSettings: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    notifyOnNewFollowers: boolean;
    notifyOnNewReviews: boolean;
    notifyOnListUpdates: boolean;
    notifyOnPlaylistUpdates: boolean;
    notifyOnActivityLikes: boolean;
    notifyOnMentions: boolean;
    notifyOnForumReplies: boolean;
    notifyOnForumMentions: boolean;
    notifyOnForumSubscriptions: boolean;
  };
  youtubeCardStyle: string;
}

type SettingsSection = "account" | "preferences" | "activity" | "theme" | "notifications" | "view" | "links";

const SETTINGS_SECTION_STORAGE_KEY = "settings-active-section";
const VALID_SECTIONS: SettingsSection[] = ["account", "preferences", "activity", "theme", "notifications", "view", "links"];

function getStoredSection(): SettingsSection | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(SETTINGS_SECTION_STORAGE_KEY);
  if (stored && VALID_SECTIONS.includes(stored as SettingsSection)) return stored as SettingsSection;
  return null;
}

export default function SettingsContent({ 
  user, 
  preferences, 
  activitySettings: initialActivitySettings,
  notificationSettings: initialNotificationSettings,
  youtubeCardStyle: initialYoutubeCardStyle
}: SettingsContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  // Initialize from URL or localStorage so the correct tab shows on first paint (persistence for all tabs)
  const [activeSection, setActiveSectionState] = useState<SettingsSection>(() => {
    if (typeof window === "undefined") return "account";
    const params = new URLSearchParams(window.location.search);
    const sectionParam = params.get("section");
    if (sectionParam && VALID_SECTIONS.includes(sectionParam as SettingsSection)) return sectionParam as SettingsSection;
    const stored = localStorage.getItem(SETTINGS_SECTION_STORAGE_KEY);
    if (stored && VALID_SECTIONS.includes(stored as SettingsSection)) return stored as SettingsSection;
    return "account";
  });

  // Sync from URL when searchParams change (e.g. client navigation to /settings?section=links)
  useEffect(() => {
    const sectionParam = searchParams.get("section");
    if (sectionParam && VALID_SECTIONS.includes(sectionParam as SettingsSection)) {
      setActiveSectionState(sectionParam as SettingsSection);
    } else if (!sectionParam) {
      const stored = getStoredSection();
      if (stored) setActiveSectionState(stored);
    }
  }, [searchParams]);

  // Persist current tab to localStorage whenever it changes (any tab: account, preferences, theme, links, etc.)
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(SETTINGS_SECTION_STORAGE_KEY, activeSection);
  }, [activeSection]);

  const setActiveSection = (section: SettingsSection) => {
    setActiveSectionState(section);
  };
  const [activitySettings, setActivitySettings] = useState(initialActivitySettings);
  const [notificationSettings, setNotificationSettings] = useState(initialNotificationSettings);
  const [youtubeCardStyle, setYoutubeCardStyle] = useState(initialYoutubeCardStyle);
  const [isSavingActivity, setIsSavingActivity] = useState(false);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [isSavingView, setIsSavingView] = useState(false);
  const [isSavingAccount, setIsSavingAccount] = useState(false);

  // Account form state (synced from user; displayName → firstName + lastName)
  const [accountUsername, setAccountUsername] = useState(user.username ?? "");
  const [accountFirstName, setAccountFirstName] = useState("");
  const [accountLastName, setAccountLastName] = useState("");

  const { user: clerkUser } = useUser();
  const accountUpdatePayloadRef = useRef<{
    username?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null>(null);

  const saveAccountWithReverification = useReverification(async () => {
    const payload = accountUpdatePayloadRef.current;
    if (!payload || !clerkUser) throw new Error("You must be signed in to update your account.");
    await clerkUser.update(payload);
  });

  // Initialize account fields from user.displayName (split into first/last)
  useEffect(() => {
    if (user.displayName) {
      const parts = user.displayName.trim().split(/\s+/);
      setAccountFirstName(parts[0] ?? "");
      setAccountLastName(parts.slice(1).join(" ") ?? "");
    } else {
      setAccountFirstName("");
      setAccountLastName("");
    }
    setAccountUsername(user.username ?? "");
  }, [user.displayName, user.username]);

  const handleSaveAccount = async () => {
    if (!clerkUser) {
      toast.error("You must be signed in to update your account.");
      return;
    }
    setIsSavingAccount(true);
    try {
      // Build update payload with only non-empty values. Sending null can trigger
      // Clerk's "additional information required" when instance requires those fields.
      const trimmedUsername = accountUsername.trim();
      const trimmedFirst = accountFirstName.trim();
      const trimmedLast = accountLastName.trim();
      const updatePayload: {
        username?: string | null;
        firstName?: string | null;
        lastName?: string | null;
      } = {};
      if (trimmedUsername !== "") {
        updatePayload.username = trimmedUsername;
      }
      if (trimmedFirst !== "" || trimmedLast !== "") {
        updatePayload.firstName = trimmedFirst || null;
        updatePayload.lastName = trimmedLast || null;
      }
      // If nothing to update, skip the call
      if (Object.keys(updatePayload).length === 0) {
        toast.info("No changes to save.");
        setIsSavingAccount(false);
        return;
      }
      accountUpdatePayloadRef.current = updatePayload;
      await saveAccountWithReverification();
      accountUpdatePayloadRef.current = null;
      toast.success("Account updated. Syncing with your profile…");
      // Give webhook time to sync to DB, then refresh page data
      queryClient.invalidateQueries({ queryKey: ["current-user", clerkUser.id] });
      setTimeout(() => router.refresh(), 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update account.";
      toast.error(message);
    } finally {
      setIsSavingAccount(false);
    }
  };

  const handleStartOnboarding = async () => {
    setIsLoading(true);
    try {
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

  const handleActivitySettingsChange = async (updates: Partial<typeof activitySettings>) => {
    const newSettings = { ...activitySettings, ...updates };
    setActivitySettings(newSettings);
    setIsSavingActivity(true);
    
    try {
      const response = await fetch("/api/user/activity-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings),
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      toast.success("Activity settings updated");
    } catch (error) {
      console.error("Error updating activity settings:", error);
      toast.error("Failed to update activity settings");
      setActivitySettings(activitySettings);
    } finally {
      setIsSavingActivity(false);
    }
  };

  const handleNotificationSettingsChange = async (updates: Partial<typeof notificationSettings>) => {
    const newSettings = { ...notificationSettings, ...updates };
    setNotificationSettings(newSettings);
    setIsSavingNotifications(true);
    
    try {
      const response = await fetch("/api/user/notification-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings),
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      toast.success("Notification settings updated");
    } catch (error) {
      console.error("Error updating notification settings:", error);
      toast.error("Failed to update notification settings");
      setNotificationSettings(notificationSettings);
    } finally {
      setIsSavingNotifications(false);
    }
  };

  const handleViewSettingsChange = async (cardStyle: string) => {
    setYoutubeCardStyle(cardStyle);
    setIsSavingView(true);
    
    try {
      const response = await fetch("/api/user/view-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtubeCardStyle: cardStyle }),
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      toast.success("View settings updated");
      // Invalidate the card style query to update all components
      queryClient.invalidateQueries({ queryKey: ["youtube-card-style"] });
    } catch (error) {
      console.error("Error updating view settings:", error);
      toast.error("Failed to update view settings");
      setYoutubeCardStyle(youtubeCardStyle);
    } finally {
      setIsSavingView(false);
    }
  };

  const settingsSections: Array<{ id: SettingsSection; label: string; icon: React.ReactNode }> = [
    { id: "account", label: "Account", icon: <UserRound className="h-4 w-4" /> },
    { id: "preferences", label: "Preferences", icon: <Palette className="h-4 w-4" /> },
    { id: "activity", label: "Activity Privacy", icon: <Lock className="h-4 w-4" /> },
    { id: "theme", label: "Theme", icon: <Sun className="h-4 w-4" /> },
    { id: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
    { id: "view", label: "View", icon: <LayoutGrid className="h-4 w-4" /> },
    { id: "links", label: "Link in bio", icon: <Link2 className="h-4 w-4" /> },
  ];

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Navigation */}
        <aside className="lg:w-64 flex-shrink-0">
          <nav className="space-y-1">
            {settingsSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                  "hover:bg-accent hover:text-accent-foreground",
                  activeSection === section.id
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                {section.icon}
                {section.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-card border rounded-lg p-6 lg:p-8">
            {/* Account Section */}
            {activeSection === "account" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-2">Account</h2>
                  <p className="text-muted-foreground">Your account information and profile details. Changes sync with your sign-in profile.</p>
                </div>
                <Separator />
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Email</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={user.email}
                        readOnly
                        className="bg-muted cursor-not-allowed"
                      />
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      To change your email, use Manage Account in the user profile menu (top right), then update your email there.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="account-first-name" className="text-sm font-medium">First name</Label>
                      <Input
                        id="account-first-name"
                        value={accountFirstName}
                        onChange={(e) => setAccountFirstName(e.target.value)}
                        placeholder="First name"
                        className="cursor-pointer"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="account-last-name" className="text-sm font-medium">Last name</Label>
                      <Input
                        id="account-last-name"
                        value={accountLastName}
                        onChange={(e) => setAccountLastName(e.target.value)}
                        placeholder="Last name"
                        className="cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account-username" className="text-sm font-medium">Username</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground shrink-0">@</span>
                      <Input
                        id="account-username"
                        value={accountUsername}
                        onChange={(e) => setAccountUsername(e.target.value.replace(/\s/g, ""))}
                        placeholder="username"
                        className="cursor-pointer"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={handleSaveAccount}
                    disabled={isSavingAccount}
                    className="cursor-pointer bg-[#006DCA] hover:bg-[#0056A3] text-white"
                  >
                    {isSavingAccount ? "Saving…" : "Save account"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    You may be asked to verify your identity (e.g. email or password) before changes are saved. If you see &quot;additional information required&quot;, complete your profile in Manage Account (profile menu) first, then save again.
                  </p>
                  <Separator />
                  <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                    <p className="text-sm font-medium">Password & security</p>
                    <p className="text-xs text-muted-foreground">
                      To change your password, open Manage Account in the user profile menu (top right), then go to Security.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Preferences Section */}
            {activeSection === "preferences" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-2">Preferences</h2>
                  <p className="text-muted-foreground">Customize your content recommendations and experience</p>
                </div>
                <Separator />
                <div className="space-y-6">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Personalization</Label>
                    <p className="text-sm text-muted-foreground mb-4">
                      {preferences?.onboardingCompleted
                        ? "You have completed onboarding. You can restart it to update your preferences."
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
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Favorite Genres</Label>
                      <p className="text-sm text-muted-foreground">
                        {preferences.favoriteGenres.length} genre
                        {preferences.favoriteGenres.length !== 1 ? "s" : ""} selected
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Activity Privacy Section */}
            {activeSection === "activity" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-2">Activity Privacy</h2>
                  <p className="text-muted-foreground">Control who can see your activity and what appears in your feed</p>
                </div>
                <Separator />
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="activity-visibility" className="text-sm font-medium">Activity Visibility</Label>
                    <Select
                      value={activitySettings.activityVisibility}
                      onValueChange={(value) => handleActivitySettingsChange({ activityVisibility: value })}
                      disabled={isSavingActivity}
                    >
                      <SelectTrigger id="activity-visibility" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PUBLIC">
                          <span className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            Public - Everyone can see your activity
                          </span>
                        </SelectItem>
                        <SelectItem value="FOLLOWERS_ONLY">
                          <span className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Followers Only - Only people you follow can see
                          </span>
                        </SelectItem>
                        <SelectItem value="PRIVATE">
                          <span className="flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            Private - Only you can see your activity
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Choose who can view your activity feed
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Show in Activity Feed</Label>
                      <p className="text-sm text-muted-foreground mb-4">
                        Toggle which types of activities appear in your public activity feed
                      </p>
                    </div>

                    <div className="space-y-4">
                      {[
                        { key: "showWatchedInActivity", label: "Watched Films", icon: Film, desc: "When you log films to your diary" },
                        { key: "showRatingsInActivity", label: "Ratings", icon: Star, desc: "When you rate films" },
                        { key: "showReviewsInActivity", label: "Reviews", icon: FileText, desc: "When you write reviews" },
                        { key: "showLikedInActivity", label: "Liked Films", icon: Heart, desc: "When you like films" },
                        { key: "showListsInActivity", label: "Lists", icon: List, desc: "When you create lists" },
                        { key: "showPlaylistsInActivity", label: "Playlists", icon: Music, desc: "When you create playlists" },
                        { key: "showFollowedInActivity", label: "Follows", icon: UserRoundPlus, desc: "When you follow users" },
                      ].map(({ key, label, icon: Icon, desc }) => (
                        <div key={key} className="flex items-center justify-between py-3 border-b last:border-b-0">
                          <div className="flex items-center gap-3 flex-1">
                            <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <Label htmlFor={key} className="cursor-pointer text-sm font-medium">
                                {label}
                              </Label>
                              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                            </div>
                          </div>
                          <Switch
                            id={key}
                            checked={activitySettings[key as keyof typeof activitySettings] as boolean}
                            onCheckedChange={(checked) =>
                              handleActivitySettingsChange({ [key]: checked } as Partial<typeof activitySettings>)
                            }
                            disabled={isSavingActivity}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Theme Section */}
            {activeSection === "theme" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-2">Theme</h2>
                  <p className="text-muted-foreground">Customize the appearance of the application</p>
                </div>
                <Separator />
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Appearance</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { value: "light", label: "Light", icon: Sun },
                      { value: "dark", label: "Dark", icon: Moon },
                      { value: "system", label: "System", icon: Monitor },
                    ].map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        onClick={() => setTheme(value)}
                        className={cn(
                          "flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all",
                          "hover:border-primary/50 hover:bg-accent/50",
                          theme === value
                            ? "border-primary bg-accent"
                            : "border-border"
                        )}
                      >
                        <Icon className="h-6 w-6" />
                        <span className="text-sm font-medium">{label}</span>
                        {theme === value && (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Choose how the application looks to you. System will match your device&apos;s theme preference.
                  </p>
                </div>
              </div>
            )}

            {/* Notifications Section */}
            {activeSection === "notifications" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-2">Notifications</h2>
                  <p className="text-muted-foreground">Manage how and when you receive notifications</p>
                </div>
                <Separator />
                <div className="space-y-6">
                  {/* Global Notification Toggles */}
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Notification Channels</Label>
                      <p className="text-sm text-muted-foreground mb-4">
                        Enable or disable notification channels
                      </p>
                    </div>
                    <div className="space-y-4">
                      {[
                        { key: "emailNotifications", label: "Email Notifications", icon: Mail, desc: "Receive notifications via email" },
                        { key: "pushNotifications", label: "Push Notifications", icon: Bell, desc: "Receive browser push notifications" },
                      ].map(({ key, label, icon: Icon, desc }) => (
                        <div key={key} className="flex items-center justify-between py-3 border-b last:border-b-0">
                          <div className="flex items-center gap-3 flex-1">
                            <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <Label htmlFor={key} className="cursor-pointer text-sm font-medium">
                                {label}
                              </Label>
                              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                            </div>
                          </div>
                          <Switch
                            id={key}
                            checked={notificationSettings[key as keyof typeof notificationSettings] as boolean}
                            onCheckedChange={(checked) =>
                              handleNotificationSettingsChange({ [key]: checked } as Partial<typeof notificationSettings>)
                            }
                            disabled={isSavingNotifications}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Specific Notification Types */}
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Notification Types</Label>
                      <p className="text-sm text-muted-foreground mb-4">
                        Choose what activities trigger notifications
                      </p>
                    </div>
                    <div className="space-y-4">
                      {[
                        { key: "notifyOnNewFollowers", label: "New Followers", icon: UserRoundPlus, desc: "When someone follows you" },
                        { key: "notifyOnNewReviews", label: "New Reviews", icon: FileText, desc: "When someone reviews content you follow" },
                        { key: "notifyOnListUpdates", label: "List Updates", icon: List, desc: "When lists you follow are updated" },
                        { key: "notifyOnPlaylistUpdates", label: "Playlist Updates", icon: Music, desc: "When playlists you follow are updated" },
                        { key: "notifyOnActivityLikes", label: "Activity Likes", icon: ThumbsUp, desc: "When someone likes your activity" },
                        { key: "notifyOnMentions", label: "Mentions", icon: AtSign, desc: "When someone mentions you" },
                      ].map(({ key, label, icon: Icon, desc }) => (
                        <div key={key} className="flex items-center justify-between py-3 border-b last:border-b-0">
                          <div className="flex items-center gap-3 flex-1">
                            <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <Label htmlFor={key} className="cursor-pointer text-sm font-medium">
                                {label}
                              </Label>
                              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                            </div>
                          </div>
                          <Switch
                            id={key}
                            checked={notificationSettings[key as keyof typeof notificationSettings] as boolean}
                            onCheckedChange={(checked) =>
                              handleNotificationSettingsChange({ [key]: checked } as Partial<typeof notificationSettings>)
                            }
                            disabled={isSavingNotifications || (!notificationSettings.emailNotifications && !notificationSettings.pushNotifications)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Forum Notification Types */}
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Forum Notifications</Label>
                      <p className="text-sm text-muted-foreground mb-4">
                        Control notifications for forum activity
                      </p>
                    </div>
                    <div className="space-y-4">
                      {[
                        { key: "notifyOnForumReplies", label: "Forum Replies", icon: MessageSquare, desc: "When someone replies to your posts or comments" },
                        { key: "notifyOnForumMentions", label: "Forum Mentions", icon: AtSign, desc: "When someone mentions you in a forum post or comment" },
                        { key: "notifyOnForumSubscriptions", label: "Subscribed Posts", icon: Bell, desc: "When subscribed posts receive new activity" },
                      ].map(({ key, label, icon: Icon, desc }) => (
                        <div key={key} className="flex items-center justify-between py-3 border-b last:border-b-0">
                          <div className="flex items-center gap-3 flex-1">
                            <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <Label htmlFor={key} className="cursor-pointer text-sm font-medium">
                                {label}
                              </Label>
                              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                            </div>
                          </div>
                          <Switch
                            id={key}
                            checked={notificationSettings[key as keyof typeof notificationSettings] as boolean}
                            onCheckedChange={(checked) =>
                              handleNotificationSettingsChange({ [key]: checked } as Partial<typeof notificationSettings>)
                            }
                            disabled={isSavingNotifications || (!notificationSettings.emailNotifications && !notificationSettings.pushNotifications)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* View Section */}
            {activeSection === "view" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-2">View</h2>
                  <p className="text-muted-foreground">Customize how content cards are displayed</p>
                </div>
                <Separator />
                <div className="space-y-6">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">YouTube Channel Cards</Label>
                    <p className="text-sm text-muted-foreground mb-4">
                      Choose your preferred card layout for YouTube channels
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        { value: "centered", label: "Centered", desc: "Profile picture centered with content below" },
                        { value: "horizontal", label: "Horizontal", desc: "Profile picture on left with content on right" },
                      ].map(({ value, label, desc }) => (
                        <button
                          key={value}
                          onClick={() => handleViewSettingsChange(value)}
                          disabled={isSavingView}
                          className={cn(
                            "flex flex-col items-start gap-2 p-4 rounded-lg border-2 transition-all text-left",
                            "hover:border-primary/50 hover:bg-accent/50",
                            youtubeCardStyle === value
                              ? "border-primary bg-accent"
                              : "border-border",
                            isSavingView && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <div className="flex items-center gap-2 w-full">
                            <span className="text-sm font-medium">{label}</span>
                            {youtubeCardStyle === value && (
                              <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Link in bio Section */}
            {activeSection === "links" && (
              <SettingsLinksSection username={user.username} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
