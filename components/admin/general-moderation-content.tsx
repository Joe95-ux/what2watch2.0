"use client";

export function GeneralModerationContent() {
  return (
    <div className="min-h-screen bg-background">
      <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">General Moderation</h1>
          <p className="text-sm text-muted-foreground">
            Moderate user reviews, comments, and other content across the platform
          </p>
        </div>

        <div className="border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">
            General moderation features coming soon. This will include moderation for:
          </p>
          <ul className="mt-4 text-sm text-muted-foreground space-y-2">
            <li>• Movie and TV show reviews</li>
            <li>• YouTube channel reviews</li>
            <li>• Comments on viewing logs</li>
            <li>• List comments</li>
            <li>• Playlist comments</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

