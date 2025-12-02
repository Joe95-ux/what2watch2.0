"use client";

import { Trophy, Award } from "lucide-react";

interface AwardsSectionProps {
  awards: string | null;
}

export default function AwardsSection({ awards }: AwardsSectionProps) {
  if (!awards || awards === "N/A") {
    return null;
  }

  // Parse awards to extract key information
  const parseAwards = (awardsText: string) => {
    const oscarMatch = awardsText.match(/(\d+)\s*(?:Oscar|Oscars)/i);
    const nominationMatch = awardsText.match(/(\d+)\s*(?:nomination|nominations)/i);
    const winMatch = awardsText.match(/(\d+)\s*(?:win|wins)/i);
    
    return {
      oscars: oscarMatch ? parseInt(oscarMatch[1], 10) : null,
      nominations: nominationMatch ? parseInt(nominationMatch[1], 10) : null,
      wins: winMatch ? parseInt(winMatch[1], 10) : null,
      fullText: awardsText,
    };
  };

  const parsed = parseAwards(awards);
  const hasOscars = parsed.oscars !== null && parsed.oscars > 0;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Awards</h2>
      <div className="rounded-lg border border-border bg-card/50 p-6">
        {hasOscars && (
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-yellow-500/20">
              <Trophy className="h-6 w-6 text-yellow-500" />
            </div>
            <div>
              <p className="font-semibold text-lg">
                {parsed.oscars} {parsed.oscars === 1 ? "Oscar" : "Oscars"}
              </p>
              {parsed.nominations && parsed.oscars !== null && parsed.nominations > parsed.oscars && (
                <p className="text-sm text-muted-foreground">
                  {parsed.nominations - parsed.oscars} additional nominations
                </p>
              )}
            </div>
          </div>
        )}
        
        <div className="flex items-start gap-3">
          <Award className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            {awards}
          </p>
        </div>
      </div>
    </div>
  );
}

