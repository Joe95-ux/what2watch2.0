"use client";

import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrendAlertBadgeProps {
  momentum: number;
  className?: string;
}

export function TrendAlertBadge({ momentum, className }: TrendAlertBadgeProps) {
  const momentumIcon =
    momentum > 0 ? (
      <ArrowUp className="h-3 w-3" />
    ) : momentum < 0 ? (
      <ArrowDown className="h-3 w-3" />
    ) : (
      <Minus className="h-3 w-3" />
    );

  return (
    <Badge
      variant={momentum > 10 ? "default" : momentum > 0 ? "secondary" : "outline"}
      className={cn(
        "flex items-center gap-1",
        momentum > 10 && "bg-green-500 hover:bg-green-600",
        momentum < -10 && "bg-red-500 hover:bg-red-600",
        className
      )}
    >
      {momentumIcon}
      <span>
        {momentum > 0 ? "+" : ""}
        {momentum.toFixed(1)}%
      </span>
    </Badge>
  );
}
