"use client";

import { UserPlus, Search, List, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

const HOW_IT_WORKS_STEPS = [
  {
    title: "Sign up & set preferences",
    description: "Create your account and tell us what you love—movies, TV, genres—so we can personalize your experience.",
    icon: UserPlus,
    side: "left" as const,
  },
  {
    title: "Get personalized picks",
    description: "Your \"Made for you\" feed and browse page adapt to your tastes with recommendations that match.",
    icon: Search,
    side: "right" as const,
  },
  {
    title: "Create lists & playlists",
    description: "Build curated lists and playlists of movies and TV shows. Add YouTube mixes for a single hub.",
    icon: List,
    side: "left" as const,
  },
  {
    title: "Share with the community",
    description: "Publish lists, follow other curators, and discover what the community is watching and discussing.",
    icon: Share2,
    side: "right" as const,
  },
];

export function HowItWorksTimeline() {
  return (
    <section className="border-b bg-muted/20 py-20 sm:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-2 text-center text-xl font-semibold sm:text-2xl">
            How it works
          </h2>
          <p className="mb-12 text-center text-sm text-muted-foreground sm:text-base">
            From sign-up to sharing in four simple steps
          </p>
          <div className="relative">
            {/* Center spine – visible from md up */}
            <div
              className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-px bg-border md:block"
              aria-hidden
            />
            {/* Timeline steps */}
            <ul className="space-y-12 md:space-y-16">
              {HOW_IT_WORKS_STEPS.map((step, index) => {
                const Icon = step.icon;
                const isLeft = step.side === "left";
                return (
                  <li
                    key={index}
                    className={cn(
                      "relative flex flex-col gap-4 md:flex-row md:items-center md:gap-8",
                      isLeft ? "md:flex-row-reverse" : ""
                    )}
                  >
                    {/* Content card – left or right of spine on desktop */}
                    <div
                      className={cn(
                        "relative ml-5 flex-1 rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6 md:ml-0",
                        isLeft ? "md:pr-14 md:text-right" : "md:pl-14 md:text-left"
                      )}
                    >
                      <div
                        className={cn(
                          "mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary",
                          isLeft ? "md:ml-auto" : ""
                        )}
                      >
                        <Icon className="h-5 w-5 [&>path]:stroke-[2.5]" />
                      </div>
                      <h3 className="mb-2 text-lg font-semibold text-foreground">
                        {step.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                    {/* Spine node – left on mobile, centered on spine on desktop */}
                    <div
                      className="absolute left-0 top-6 h-3 w-3 shrink-0 rounded-full border-2 border-primary bg-background md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:h-4 md:w-4 md:bg-primary/10"
                      aria-hidden
                    />
                    {/* Spacer for desktop layout */}
                    <div className="hidden flex-1 md:block" aria-hidden />
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
