"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export default function OnboardingStepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
      <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-center">
          {Array.from({ length: totalSteps }, (_, index) => {
            const step = index + 1;
            const isCompleted = index < currentStep - 1;
            const isActive = index === currentStep - 1;

            return (
              <div key={step} className="flex items-center">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300",
                    isCompleted
                      ? "bg-gradient-to-r from-[#066f72] to-[#0d9488] text-white"
                      : isActive
                      ? "bg-primary/10 text-primary border-2 border-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    step
                  )}
                </div>
                {index < totalSteps - 1 && (
                  <div
                    className={cn(
                      "w-12 h-0.5 transition-all duration-300",
                      isCompleted ? "bg-primary" : "bg-border"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
