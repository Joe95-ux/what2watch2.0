export const DASHBOARD_SECTION_IDS = [
  "services",
  "continue",
  "madeForYou",
  "myList",
  "playlists",
  "trendAlerts",
  "youtube",
] as const;

export type DashboardSectionId = (typeof DASHBOARD_SECTION_IDS)[number];

export const DASHBOARD_SECTION_META: Record<
  DashboardSectionId,
  { label: string; description: string }
> = {
  services: { label: "Streaming services", description: "The services you watch on" },
  continue: { label: "Continue watching", description: "Titles you opened recently" },
  madeForYou: { label: "Made for you", description: "Picks from your genres" },
  myList: { label: "My List", description: "Saved titles" },
  playlists: { label: "Playlists", description: "Playlists you created" },
  trendAlerts: { label: "Trend alerts", description: "Titles moving on your services" },
  youtube: { label: "YouTube snapshot", description: "Saved videos and playlists" },
};

export const DASHBOARD_STAT_IDS = [
  "watchlist",
  "playlists",
  "recentlyViewed",
  "playlistReach",
  "diaryLogs",
  "watchedThisWeek",
] as const;

export type DashboardStatId = (typeof DASHBOARD_STAT_IDS)[number];

export const DASHBOARD_STAT_META: Record<DashboardStatId, { label: string; helper: string }> = {
  watchlist: { label: "Watchlist", helper: "Saved titles" },
  playlists: { label: "Playlists", helper: "Curated lists" },
  recentlyViewed: { label: "Recently viewed", helper: "Items viewed" },
  playlistReach: { label: "Playlist reach", helper: "Visits and shares" },
  diaryLogs: { label: "Diary logs", helper: "Entries in your diary" },
  watchedThisWeek: { label: "Watched this week", helper: "Logged in the last 7 days" },
};

export const DASHBOARD_LANDINGS = [
  { id: "home", label: "Home", href: "/dashboard", description: "The customizable home" },
  { id: "watching", label: "Watching", href: "/dashboard/watching", description: "Live watch hub" },
  { id: "diary", label: "Diary", href: "/dashboard/diary", description: "Your log" },
  { id: "youtube", label: "YouTube", href: "/dashboard/youtube", description: "YouTube dashboard" },
] as const;

export type DashboardLanding = (typeof DASHBOARD_LANDINGS)[number]["id"];

export type DashboardPickDefaults = {
  picksHidden: boolean;
  onlyUnseen: boolean;
  trendingToday: boolean;
};

export type DashboardLayout = {
  sectionOrder: DashboardSectionId[];
  hiddenSections: DashboardSectionId[];
  statIds: DashboardStatId[];
  landing: DashboardLanding;
  pickDefaults: DashboardPickDefaults;
};

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = {
  sectionOrder: [...DASHBOARD_SECTION_IDS],
  hiddenSections: [],
  statIds: ["watchlist", "playlists", "recentlyViewed", "playlistReach"],
  landing: "home",
  pickDefaults: {
    picksHidden: false,
    onlyUnseen: true,
    trendingToday: false,
  },
};

function isSectionId(value: unknown): value is DashboardSectionId {
  return typeof value === "string" && (DASHBOARD_SECTION_IDS as readonly string[]).includes(value);
}

function isStatId(value: unknown): value is DashboardStatId {
  return typeof value === "string" && (DASHBOARD_STAT_IDS as readonly string[]).includes(value);
}

function isLanding(value: unknown): value is DashboardLanding {
  return DASHBOARD_LANDINGS.some((item) => item.id === value);
}

function uniqueInOrder<T extends string>(values: T[], allowed: readonly T[]): T[] {
  const seen = new Set<T>();
  const result: T[] = [];
  for (const value of values) {
    if (!allowed.includes(value) || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  for (const value of allowed) {
    if (!seen.has(value)) result.push(value);
  }
  return result;
}

export function dashboardLandingHref(landing: DashboardLanding): string {
  return DASHBOARD_LANDINGS.find((item) => item.id === landing)?.href ?? "/dashboard";
}

export function normalizeDashboardLayout(raw: unknown): DashboardLayout {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const sectionOrder = uniqueInOrder(
    Array.isArray(source.sectionOrder) ? source.sectionOrder.filter(isSectionId) : [],
    DASHBOARD_SECTION_IDS
  );
  const hiddenSections = Array.isArray(source.hiddenSections)
    ? source.hiddenSections.filter(isSectionId).filter((id, index, list) => list.indexOf(id) === index)
    : [];
  const requestedStats = (
    Array.isArray(source.statIds) ? source.statIds.filter(isStatId) : []
  ).filter((id, index, list) => list.indexOf(id) === index);
  const statIds = requestedStats.slice(0, 4);
  for (const id of [...DEFAULT_DASHBOARD_LAYOUT.statIds, ...DASHBOARD_STAT_IDS]) {
    if (statIds.length >= 4) break;
    if (!statIds.includes(id)) statIds.push(id);
  }
  const pickSource =
    source.pickDefaults && typeof source.pickDefaults === "object"
      ? (source.pickDefaults as Record<string, unknown>)
      : {};

  return {
    sectionOrder,
    hiddenSections,
    statIds,
    landing: isLanding(source.landing) ? source.landing : "home",
    pickDefaults: {
      picksHidden: pickSource.picksHidden === true,
      onlyUnseen: pickSource.onlyUnseen !== false,
      trendingToday: pickSource.trendingToday === true,
    },
  };
}
