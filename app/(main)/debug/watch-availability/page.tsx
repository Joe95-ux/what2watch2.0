"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { JustWatchAvailabilityResponse } from "@/lib/justwatch";

// Replicate the getQuality function from watch-list-view.tsx
const getQuality = (presentationType: string | null | undefined): string => {
  if (!presentationType) return "";
  const quality = presentationType.toLowerCase();
  // Check for highest quality first (order matters to avoid false positives)
  if (quality.includes("4k") || quality.includes("uhd")) return "4K";
  if (quality.includes("hd")) return "HD"; // "uhd" is already handled above
  if (quality.includes("sd")) return "SD";
  return "";
};

export default function WatchAvailabilityDebugPage() {
  const [type, setType] = useState<"movie" | "tv">("movie");
  const [tmdbId, setTmdbId] = useState<string>("550"); // Fight Club as default
  const [country, setCountry] = useState<string>("US");
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<JustWatchAvailabilityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFetch = async () => {
    setIsLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await fetch(`/api/justwatch/${type}/${tmdbId}?country=${country}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setIsLoading(false);
    }
  };

  // Analyze quality data
  const qualityAnalysis = data
    ? (() => {
        const allOffers = data.allOffers || [];
        const qualityMap = new Map<string, { count: number; examples: Array<{ presentationType: string | null; providerName: string; monetizationType: string }> }>();
        const unrecognized: Array<{ presentationType: string | null; providerName: string; monetizationType: string }> = [];

        allOffers.forEach((offer) => {
          const presentationType = offer.presentationType;
          const detectedQuality = getQuality(presentationType);
          
          if (detectedQuality) {
            if (!qualityMap.has(detectedQuality)) {
              qualityMap.set(detectedQuality, { count: 0, examples: [] });
            }
            const entry = qualityMap.get(detectedQuality)!;
            entry.count++;
            if (entry.examples.length < 3) {
              entry.examples.push({
                presentationType,
                providerName: offer.providerName,
                monetizationType: offer.monetizationType,
              });
            }
          } else if (presentationType) {
            unrecognized.push({
              presentationType,
              providerName: offer.providerName,
              monetizationType: offer.monetizationType,
            });
          }
        });

        return {
          qualityMap: Array.from(qualityMap.entries()).map(([quality, data]) => ({
            quality,
            ...data,
          })),
          unrecognized: unrecognized.slice(0, 20), // Limit to first 20
          totalOffers: allOffers.length,
          offersWithQuality: allOffers.filter((o) => o.presentationType).length,
          offersWithoutQuality: allOffers.filter((o) => !o.presentationType).length,
        };
      })()
    : null;

  // Get unique presentation types
  const uniquePresentationTypes = data
    ? Array.from(
        new Set(
          (data.allOffers || [])
            .map((o) => o.presentationType)
            .filter((pt): pt is string => pt !== null && pt !== undefined)
        )
      ).sort()
    : [];

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Watch Availability Debug</h1>
        <p className="text-muted-foreground">
          Debug tool to inspect watch availability data and quality information from the JustWatch API
        </p>
      </div>

      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle>Fetch Watch Availability</CardTitle>
          <CardDescription>Enter content details to fetch watch availability data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value as "movie" | "tv")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="movie">Movie</option>
                <option value="tv">TV Show</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tmdbId">TMDB ID</Label>
              <Input
                id="tmdbId"
                type="number"
                value={tmdbId}
                onChange={(e) => setTmdbId(e.target.value)}
                placeholder="550"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country Code</Label>
              <Input
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value.toUpperCase())}
                placeholder="US"
                maxLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button onClick={handleFetch} disabled={isLoading} className="w-full">
                {isLoading ? "Fetching..." : "Fetch Data"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {data && (
        <Tabs defaultValue="quality" className="space-y-4">
          <TabsList>
            <TabsTrigger value="quality">Quality Analysis</TabsTrigger>
            <TabsTrigger value="presentation-types">Presentation Types</TabsTrigger>
            <TabsTrigger value="raw-data">Raw Data</TabsTrigger>
            <TabsTrigger value="offers">All Offers</TabsTrigger>
          </TabsList>

          {/* Quality Analysis Tab */}
          <TabsContent value="quality" className="space-y-4">
            {qualityAnalysis && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Quality Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Offers</p>
                        <p className="text-2xl font-bold">{qualityAnalysis.totalOffers}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">With Quality</p>
                        <p className="text-2xl font-bold">{qualityAnalysis.offersWithQuality}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Without Quality</p>
                        <p className="text-2xl font-bold">{qualityAnalysis.offersWithoutQuality}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Unique Qualities</p>
                        <p className="text-2xl font-bold">{qualityAnalysis.qualityMap.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Detected Qualities</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {qualityAnalysis.qualityMap.map(({ quality, count, examples }) => (
                      <div key={quality} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-lg">{quality}</h3>
                          <span className="text-sm text-muted-foreground">{count} offers</span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Example presentationType values:</p>
                          {examples.map((ex, idx) => (
                            <div key={idx} className="text-sm font-mono bg-muted p-2 rounded">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{ex.presentationType}</span>
                                <span className="text-muted-foreground">•</span>
                                <span>{ex.providerName}</span>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-xs">{ex.monetizationType}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {qualityAnalysis.unrecognized.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Unrecognized Presentation Types</CardTitle>
                      <CardDescription>
                        These presentationType values were not recognized by getQuality()
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {qualityAnalysis.unrecognized.map((item, idx) => (
                          <div key={idx} className="text-sm font-mono bg-muted p-2 rounded">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{item.presentationType || "(null)"}</span>
                              <span className="text-muted-foreground">•</span>
                              <span>{item.providerName}</span>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-xs">{item.monetizationType}</span>
                            </div>
                          </div>
                        ))}
                        {qualityAnalysis.unrecognized.length >= 20 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Showing first 20 unrecognized types. There may be more.
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* Presentation Types Tab */}
          <TabsContent value="presentation-types" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Unique Presentation Types</CardTitle>
                <CardDescription>
                  All unique presentationType values found in the response
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {uniquePresentationTypes.map((pt, idx) => {
                    const detected = getQuality(pt);
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <code className="text-sm font-mono">{pt}</code>
                        <div className="flex items-center gap-2">
                          {detected ? (
                            <span className="px-2 py-1 bg-primary/10 text-primary rounded text-sm font-semibold">
                              → {detected}
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-muted text-muted-foreground rounded text-sm">
                              Not recognized
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Raw Data Tab */}
          <TabsContent value="raw-data">
            <Card>
              <CardHeader>
                <CardTitle>Raw API Response</CardTitle>
                <CardDescription>Complete JSON response from the API</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="text-xs overflow-auto bg-muted p-4 rounded-lg max-h-[600px]">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>

          {/* All Offers Tab */}
          <TabsContent value="offers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Offers</CardTitle>
                <CardDescription>
                  All offers with their presentationType and detected quality
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {(data.allOffers || []).map((offer, idx) => {
                    const detected = getQuality(offer.presentationType);
                    return (
                      <div
                        key={idx}
                        className="p-3 border rounded-lg text-sm space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{offer.providerName}</span>
                          <span className="text-xs text-muted-foreground">{offer.monetizationType}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                            {offer.presentationType || "(null)"}
                          </code>
                          {detected && (
                            <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-semibold">
                              → {detected}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
