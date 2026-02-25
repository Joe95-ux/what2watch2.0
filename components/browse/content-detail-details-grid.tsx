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

  return (
    <div>
      <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
        Details
      </h3>
      <div className="grid grid-cols-2 gap-4 text-sm">
        {type === "movie" && "release_date" in details && details.release_date && (
          <div>
            <span className="text-muted-foreground block mb-1">Release Date</span>
            <p className="font-medium text-foreground">{formatDate(details.release_date)}</p>
          </div>
        )}
        {type === "tv" && "first_air_date" in details && details.first_air_date && (
          <div>
            <span className="text-muted-foreground block mb-1">First Air Date</span>
            <p className="font-medium text-foreground">{formatDate(details.first_air_date)}</p>
          </div>
        )}
        {type === "movie" && "runtime" in details && details.runtime && (
          <div>
            <span className="text-muted-foreground block mb-1">Runtime</span>
            <p className="font-medium text-foreground">{formatRuntime(details.runtime)}</p>
          </div>
        )}
        {type === "tv" && "episode_run_time" in details && details.episode_run_time?.[0] && (
          <div>
            <span className="text-muted-foreground block mb-1">Episode Runtime</span>
            <p className="font-medium text-foreground">
              {formatRuntime(details.episode_run_time[0])}
            </p>
          </div>
        )}
        {type === "tv" && "number_of_seasons" in details && (
          <div>
            <span className="text-muted-foreground block mb-1">Seasons</span>
            <p className="font-medium text-foreground">{details.number_of_seasons}</p>
          </div>
        )}
        {type === "tv" && "number_of_episodes" in details && (
          <div>
            <span className="text-muted-foreground block mb-1">Episodes</span>
            <p className="font-medium text-foreground">{details.number_of_episodes}</p>
          </div>
        )}
        {details.production_countries && details.production_countries.length > 0 && (
          <div>
            <span className="text-muted-foreground block mb-1">Country</span>
            <p className="font-medium text-foreground">
              {details.production_countries.map((c) => c.name).join(", ")}
            </p>
          </div>
        )}
        {details.spoken_languages && details.spoken_languages.length > 0 && (
          <div>
            <span className="text-muted-foreground block mb-1">Language</span>
            <p className="font-medium text-foreground">
              {details.spoken_languages.map((l) => l.english_name).join(", ")}
            </p>
          </div>
        )}
        {details.production_companies && details.production_companies.length > 0 && (
          <div>
            <span className="text-muted-foreground block mb-1">Production</span>
            <p className="font-medium text-foreground">
              {details.production_companies
                .slice(0, 3)
                .map((c) => c.name)
                .join(", ")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
