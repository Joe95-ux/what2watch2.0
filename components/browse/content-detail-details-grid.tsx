"use client";

interface ContentDetailDetailsGridProps {
  type: "movie" | "tv";
  details: {
    release_date?: string;
    first_air_date?: string;
    runtime?: number;
    episode_run_time?: number[];
    production_countries?: Array<{ iso_3166_1: string; name: string }>;
    spoken_languages?: Array<{ english_name: string; iso_639_1: string; name: string }>;
    production_companies?: Array<{ id: number; name: string; logo_path?: string | null }>;
    number_of_seasons?: number;
    number_of_episodes?: number;
  } | null;
}

export default function ContentDetailDetailsGrid({
  type,
  details,
}: ContentDetailDetailsGridProps) {
  if (!details) return null;

  const formatDate = (date: string | null | undefined): string => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatRuntime = (minutes: number | number[] | undefined): string => {
    if (!minutes) return "N/A";
    if (Array.isArray(minutes)) {
      return `${minutes[0]} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  // Build entries array
  const entries: Array<{ label: string; value: string }> = [];

  if (type === "movie" && "release_date" in details && details.release_date) {
    entries.push({ label: "Release Date", value: formatDate(details.release_date) });
  }
  if (type === "tv" && "first_air_date" in details && details.first_air_date) {
    entries.push({ label: "First Air Date", value: formatDate(details.first_air_date) });
  }
  if (type === "movie" && "runtime" in details && details.runtime) {
    entries.push({ label: "Runtime", value: formatRuntime(details.runtime) });
  }
  if (type === "tv" && "episode_run_time" in details && details.episode_run_time?.[0]) {
    entries.push({ label: "Episode Runtime", value: formatRuntime(details.episode_run_time[0]) });
  }
  if (type === "tv" && "number_of_seasons" in details && "number_of_episodes" in details) {
    const seasons = details.number_of_seasons;
    const episodes = details.number_of_episodes;
    entries.push({ label: "Seasons & Episodes", value: `${seasons} seasons, ${episodes} episodes` });
  }
  if (details.production_countries && details.production_countries.length > 0) {
    entries.push({
      label: "Country",
      value: details.production_countries.map((c) => c.name).join(", "),
    });
  }
  if (details.production_companies && details.production_companies.length > 0) {
    entries.push({
      label: "Production",
      value: details.production_companies.slice(0, 3).map((c) => c.name).join(", "),
    });
  }

  if (entries.length === 0) return null;

  return (
    <div>
      <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
        Details
      </h3>
      <div className="space-y-0 text-sm">
        {entries.map((entry, index) => (
          <div key={entry.label}>
            <div className="py-3">
              <span className="text-muted-foreground block mb-1">{entry.label}</span>
              <p className="font-medium text-foreground">{entry.value}</p>
            </div>
            {index < entries.length - 1 && <div className="border-t border-border" />}
          </div>
        ))}
      </div>
    </div>
  );
}
