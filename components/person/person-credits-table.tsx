"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { TMDBPersonMovieCredits, TMDBPersonTVCredits } from "@/lib/tmdb";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUpDown } from "lucide-react";

type CreditType = "all" | "movies" | "tv";
type RoleType = "all" | "cast" | "crew";
type SortBy = "year" | "rating" | "title";

interface PersonCreditsTableProps {
  movieCredits: TMDBPersonMovieCredits | null | undefined;
  tvCredits: TMDBPersonTVCredits | null | undefined;
}

interface CombinedCredit {
  id: number;
  title: string;
  type: "movie" | "tv";
  year: number | null;
  vote_average: number;
  character?: string;
  job?: string;
  department?: string;
}

export default function PersonCreditsTable({
  movieCredits,
  tvCredits,
}: PersonCreditsTableProps) {
  const router = useRouter();
  const [creditType, setCreditType] = useState<CreditType>("all");
  const [roleType, setRoleType] = useState<RoleType>("all");
  const [sortBy, setSortBy] = useState<SortBy>("year");

  // Combine and format all credits
  const allCredits = useMemo(() => {
    const credits: CombinedCredit[] = [];

    // Add movie cast
    if (movieCredits?.cast) {
      movieCredits.cast.forEach((credit) => {
        const year = credit.release_date
          ? new Date(credit.release_date).getFullYear()
          : null;
        credits.push({
          id: credit.id,
          title: credit.title,
          type: "movie",
          year,
          vote_average: credit.vote_average,
          character: credit.character,
        });
      });
    }

    // Add movie crew
    if (movieCredits?.crew) {
      movieCredits.crew.forEach((credit) => {
        const year = credit.release_date
          ? new Date(credit.release_date).getFullYear()
          : null;
        credits.push({
          id: credit.id,
          title: credit.title,
          type: "movie",
          year,
          vote_average: credit.vote_average,
          job: credit.job,
          department: credit.department,
        });
      });
    }

    // Add TV cast
    if (tvCredits?.cast) {
      tvCredits.cast.forEach((credit) => {
        const year = credit.first_air_date
          ? new Date(credit.first_air_date).getFullYear()
          : null;
        credits.push({
          id: credit.id,
          title: credit.name,
          type: "tv",
          year,
          vote_average: credit.vote_average,
          character: credit.character,
        });
      });
    }

    // Add TV crew
    if (tvCredits?.crew) {
      tvCredits.crew.forEach((credit) => {
        const year = credit.first_air_date
          ? new Date(credit.first_air_date).getFullYear()
          : null;
        credits.push({
          id: credit.id,
          title: credit.name,
          type: "tv",
          year,
          vote_average: credit.vote_average,
          job: credit.job,
          department: credit.department,
        });
      });
    }

    return credits;
  }, [movieCredits, tvCredits]);

  // Filter credits
  const filteredCredits = useMemo(() => {
    let filtered = allCredits;

    // Filter by type
    if (creditType === "movies") {
      filtered = filtered.filter((c) => c.type === "movie");
    } else if (creditType === "tv") {
      filtered = filtered.filter((c) => c.type === "tv");
    }

    // Filter by role
    if (roleType === "cast") {
      filtered = filtered.filter((c) => c.character !== undefined);
    } else if (roleType === "crew") {
      filtered = filtered.filter((c) => c.job !== undefined);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "year":
          if (a.year === null && b.year === null) return 0;
          if (a.year === null) return 1;
          if (b.year === null) return -1;
          return b.year - a.year; // Descending (newest first)
        case "rating":
          return b.vote_average - a.vote_average;
        case "title":
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return filtered;
  }, [allCredits, creditType, roleType, sortBy]);

  const handleSort = (newSortBy: SortBy) => {
    if (sortBy === newSortBy) {
      // Toggle ascending/descending could be added here
    }
    setSortBy(newSortBy);
  };

  if (allCredits.length === 0) {
    return (
      <section>
        <h2 className="text-2xl font-bold mb-6">Credits</h2>
        <p className="text-muted-foreground">No credits available.</p>
      </section>
    );
  }

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold">
          Credits ({filteredCredits.length})
        </h2>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <Tabs value={creditType} onValueChange={(v) => setCreditType(v as CreditType)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="movies">Movies</TabsTrigger>
              <TabsTrigger value="tv">TV Shows</TabsTrigger>
            </TabsList>
          </Tabs>

          <Tabs value={roleType} onValueChange={(v) => setRoleType(v as RoleType)}>
            <TabsList>
              <TabsTrigger value="all">All Roles</TabsTrigger>
              <TabsTrigger value="cast">Cast</TabsTrigger>
              <TabsTrigger value="crew">Crew</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Sort Options */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <Button
          variant={sortBy === "year" ? "default" : "outline"}
          size="sm"
          onClick={() => handleSort("year")}
        >
          <ArrowUpDown className="h-4 w-4 mr-2" />
          Year
        </Button>
        <Button
          variant={sortBy === "rating" ? "default" : "outline"}
          size="sm"
          onClick={() => handleSort("rating")}
        >
          <ArrowUpDown className="h-4 w-4 mr-2" />
          Rating
        </Button>
        <Button
          variant={sortBy === "title" ? "default" : "outline"}
          size="sm"
          onClick={() => handleSort("title")}
        >
          <ArrowUpDown className="h-4 w-4 mr-2" />
          Title
        </Button>
      </div>

      {/* Credits Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Year
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[200px]">
                  Title
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {roleType === "cast" ? "Character" : roleType === "crew" ? "Job" : "Role"}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Type
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Rating
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCredits.map((credit, index) => (
                <tr
                  key={`${credit.type}-${credit.id}-${index}`}
                  className="hover:bg-muted/20 transition-colors cursor-pointer group"
                  onClick={() => router.push(`/${credit.type}/${credit.id}`)}
                >
                  <td className="px-4 py-4 text-sm text-muted-foreground whitespace-nowrap">
                    {credit.year || "—"}
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-medium text-sm group-hover:text-primary transition-colors">
                      {credit.title}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-sm text-muted-foreground">
                    {credit.character || credit.job || "—"}
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-muted text-foreground">
                      {credit.type === "movie" ? "Movie" : "TV"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-muted-foreground">
                    {credit.vote_average > 0 ? credit.vote_average.toFixed(1) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

