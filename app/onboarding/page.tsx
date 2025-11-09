"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import OnboardingStepIndicator from "@/components/onboarding/step-indicator";
import ContentSelection from "@/components/onboarding/content-selection";
import LoadingScreen from "@/components/onboarding/loading-screen";

type OnboardingStep = "signup" | "welcome" | "content";

// Steps to show in progress indicator
const steps: OnboardingStep[] = ["signup", "welcome", "content"];

interface LikedContent {
  id: number;
  type: "movie" | "tv";
  genreIds: number[];
}

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("signup");
  const [currentPhase, setCurrentPhase] = useState(1);
  const [likedContent, setLikedContent] = useState<LikedContent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const router = useRouter();
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded && !user) {
      router.push("/sign-in");
    }
    // Auto-advance from signup step after a brief moment
    if (isLoaded && user && currentStep === "signup") {
      const timer = setTimeout(() => {
        setCurrentStep("welcome");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isLoaded, user, router, currentStep]);

  const handleNext = () => {
    if (currentStep === "welcome") {
      setCurrentStep("content");
    }
  };

  const handleSkip = async () => {
    setIsLoading(true);
    setShowLoading(true);
    try {
      await fetch("/api/user/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          favoriteGenres: [],
          onboardingCompleted: true,
        }),
      });
      await new Promise((resolve) => setTimeout(resolve, 2000));
      router.push("/browse");
    } catch (error) {
      console.error("Error skipping onboarding:", error);
      toast.error("Failed to skip onboarding");
      setShowLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContentLiked = (content: LikedContent) => {
    setLikedContent((prev) => [...prev, content]);
  };

  const handleContentDisliked = () => {
    // Track dislikes if needed, but focus on likes for now
  };

  const handlePhaseComplete = () => {
    if (currentPhase < 3) {
      setCurrentPhase(currentPhase + 1);
    } else {
      // All phases complete, save preferences
      handleComplete();
    }
  };

  const handleComplete = async () => {
    // Extract genres from liked content
    const genreCounts = new Map<number, number>();
    const typeCounts = { movie: 0, tv: 0 };

    likedContent.forEach((content) => {
      typeCounts[content.type]++;
      content.genreIds.forEach((genreId) => {
        genreCounts.set(genreId, (genreCounts.get(genreId) || 0) + 1);
      });
    });

    // Get top genres (appeared in at least 2 liked items, or top 5 if less)
    const sortedGenres = Array.from(genreCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .filter(([, count]) => count >= 2)
      .map(([genreId]) => genreId)
      .slice(0, 10);

    // If no genres meet threshold, use top genres by frequency
    const favoriteGenres =
      sortedGenres.length > 0
        ? sortedGenres
        : Array.from(genreCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([genreId]) => genreId);

    setIsLoading(true);
    setShowLoading(true);
    try {
      const response = await fetch("/api/user/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          favoriteGenres,
          preferredTypes:
            typeCounts.movie > typeCounts.tv
              ? ["movie"]
              : typeCounts.tv > typeCounts.movie
              ? ["tv"]
              : ["movie", "tv"],
          onboardingCompleted: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save preferences");
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
      router.push("/browse");
    } catch (error) {
      console.error("Error completing onboarding:", error);
      toast.error("Failed to save preferences");
      setShowLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate current step index for progress indicator
  const currentStepIndex = steps.findIndex((s) => s === currentStep) + 1;

  if (!isLoaded || !user) {
    return null;
  }

  if (showLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="h-full bg-background flex flex-col overflow-hidden">
      {/* Fixed Progress Indicator - Top */}
      <OnboardingStepIndicator
        currentStep={currentStepIndex}
        totalSteps={steps.length}
      />

      {/* Main Content - Scrollable area below fixed header */}
      <div className="flex items-center justify-center flex-1 overflow-y-auto pt-24 pb-12">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-2xl mx-auto space-y-8">
            {/* Sign-up Step - Auto-advances */}
            {currentStep === "signup" && (
              <div className="space-y-6 text-center animate-in fade-in-50 duration-500">
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping"></div>
                      <div className="relative rounded-full bg-primary/10 p-6">
                        <Check className="h-12 w-12 text-primary animate-in zoom-in duration-300" />
                      </div>
                    </div>
                  </div>
                  <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
                    Account Created!
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    You&apos;ve successfully signed up. Let&apos;s set up your personalized experience.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-4">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                  <span>Preparing your workspace...</span>
                </div>
              </div>
            )}

            {/* Welcome Step */}
            {currentStep === "welcome" && (
              <div className="space-y-6 text-center animate-in fade-in-50 duration-500">
                <div className="space-y-4">
                  <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
                    Welcome to What2Watch
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    Let&apos;s personalize your experience. Tell us what movies and TV shows you love.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                  <Button
                    size="lg"
                    onClick={handleNext}
                    className="bg-gradient-to-r from-[#066f72] to-[#0d9488] hover:from-[#055a5d] hover:to-[#0a7a6e] text-white h-11 text-base"
                  >
                    Get Started
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleSkip}
                    disabled={isLoading}
                    className="h-11 text-base"
                  >
                    Skip for Now
                  </Button>
                </div>
              </div>
            )}

            {/* Content Selection Step */}
            {currentStep === "content" && (
              <div className="space-y-8 animate-in fade-in-50 slide-in-from-bottom-4 duration-500 pt-8">
                <div className="space-y-2 text-center">
                  <h1 className="text-[22px] font-semibold tracking-tight">
                    What movies and TV shows do you love?
                  </h1>
                  <p className="text-[1rem] text-muted-foreground">
                    {currentPhase === 1 && "Let's start with some popular titles"}
                    {currentPhase === 2 && "Now let's see some top-rated content"}
                    {currentPhase === 3 && "Finally, let's explore diverse genres"}
                  </p>
                  
                  {/* Dashed Phase Indicators */}
                  <div className="flex items-center justify-center gap-2 mt-4">
                    {[1, 2, 3].map((phaseNum) => (
                      <div key={phaseNum} className="flex items-center">
                        <div
                          className={cn(
                            "h-2 w-8 rounded-full transition-all duration-300",
                            phaseNum <= currentPhase
                              ? "bg-gradient-to-r from-[#066f72] to-[#0d9488]"
                              : "bg-transparent border-2 border-dashed border-muted-foreground/40"
                          )}
                        />
                        {phaseNum < 3 && (
                          <div
                            className={cn(
                              "w-6 transition-all duration-300",
                              phaseNum < currentPhase
                                ? "h-0.5 bg-gradient-to-r from-[#066f72] to-[#0d9488]"
                                : "h-px border-t border-dashed border-muted-foreground/40"
                            )}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <ContentSelection
                  phase={currentPhase}
                  onContentLiked={handleContentLiked}
                  onContentDisliked={handleContentDisliked}
                  onPhaseComplete={handlePhaseComplete}
                />

                <div className="flex justify-center pt-2">
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleComplete}
                    disabled={isLoading}
                    className="h-11 text-base"
                  >
                    {likedContent.length === 0
                      ? "Skip"
                      : `Complete with ${likedContent.length} selection${likedContent.length !== 1 ? "s" : ""}`}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
