vi.mock("@/lib/db", () => ({
  db: {
    episodeViewingLog: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/lib/tmdb", () => ({
  getTVSeasonDetails: vi.fn(),
}));

describe("syncEpisodeViewingFromSession", () => {
  beforeEach(async () => {
    const { db } = await import("@/lib/db");
    const { getTVSeasonDetails } = await import("@/lib/tmdb");
    vi.clearAllMocks();
    vi.mocked(db.episodeViewingLog.upsert).mockReset();
    vi.mocked(getTVSeasonDetails).mockReset();
  });

  it("upserts episode viewing log for finished TV episode sessions", async () => {
    const { syncEpisodeViewingFromSession } = await import("@/lib/watching-finish-sync");
    const { db } = await import("@/lib/db");
    const { getTVSeasonDetails } = await import("@/lib/tmdb");
    vi.mocked(getTVSeasonDetails).mockResolvedValueOnce({
      episodes: [{ id: 444, episode_number: 3 }],
    } as never);

    const watchedAt = new Date("2026-04-28T12:00:00.000Z");
    await syncEpisodeViewingFromSession(
      {
        userId: "user-1",
        tmdbId: 100,
        mediaType: "tv",
        title: "Example Show",
        posterPath: null,
        backdropPath: null,
        seasonNumber: 2,
        episodeNumber: 3,
      },
      watchedAt
    );

    expect(getTVSeasonDetails).toHaveBeenCalledWith(100, 2);
    expect(db.episodeViewingLog.upsert).toHaveBeenCalledTimes(1);
    expect(db.episodeViewingLog.upsert).toHaveBeenCalledWith({
      where: {
        userId_tvShowTmdbId_episodeId: {
          userId: "user-1",
          tvShowTmdbId: 100,
          episodeId: 444,
        },
      },
      create: {
        userId: "user-1",
        tvShowTmdbId: 100,
        tvShowTitle: "Example Show",
        episodeId: 444,
        seasonNumber: 2,
        episodeNumber: 3,
        watchedAt,
      },
      update: {
        watchedAt,
      },
    });
  });

  it("does not sync non-tv sessions", async () => {
    const { syncEpisodeViewingFromSession } = await import("@/lib/watching-finish-sync");
    const { db } = await import("@/lib/db");
    const { getTVSeasonDetails } = await import("@/lib/tmdb");
    await syncEpisodeViewingFromSession(
      {
        userId: "user-1",
        tmdbId: 1,
        mediaType: "movie",
        title: "Movie",
        posterPath: null,
        backdropPath: null,
      },
      new Date()
    );

    expect(getTVSeasonDetails).not.toHaveBeenCalled();
    expect(db.episodeViewingLog.upsert).not.toHaveBeenCalled();
  });
});
