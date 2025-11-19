"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

interface PersonBiographyProps {
  biography: string;
}

const MAX_LENGTH = 500;

export default function PersonBiography({ biography }: PersonBiographyProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!biography || biography.trim() === "") {
    return (
      <section>
        <h2 className="text-2xl font-bold mb-4">Biography</h2>
        <p className="text-muted-foreground">No biography available.</p>
      </section>
    );
  }

  const shouldTruncate = biography.length > MAX_LENGTH;
  const displayText = shouldTruncate && !isExpanded
    ? biography.slice(0, MAX_LENGTH) + "..."
    : biography;

  return (
    <section>
      <h2 className="text-2xl font-bold mb-4">Biography</h2>
      <div className="prose prose-invert max-w-none">
        <p className="text-foreground leading-relaxed whitespace-pre-line">
          {displayText}
        </p>
      </div>
      {shouldTruncate && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-4"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-1" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-1" />
              Read More
            </>
          )}
        </Button>
      )}
    </section>
  );
}

