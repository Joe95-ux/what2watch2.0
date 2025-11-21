import { NextRequest, NextResponse } from "next/server";

interface YouTubeApiError {
  domain?: string;
  reason?: string;
  message?: string;
}

/**
 * Get YouTube video duration using YouTube Data API v3
 * Requires YOUTUBE_API_KEY environment variable
 * 
 * If no API key is configured, returns null
 * Duration is returned in seconds
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("videoId");

    console.log("[YouTube Duration API] Request received:", { videoId });

    if (!videoId) {
      console.warn("[YouTube Duration API] Missing videoId parameter");
      return NextResponse.json(
        { error: "videoId is required" },
        { status: 400 }
      );
    }

    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

    if (!YOUTUBE_API_KEY) {
      console.error("[YouTube Duration API] YOUTUBE_API_KEY environment variable is not set");
      console.log("[YouTube Duration API] To fix: Add YOUTUBE_API_KEY to your .env.local file");
      console.log("[YouTube Duration API] Get a key from: https://console.cloud.google.com/apis/credentials");
      // No API key configured - return null
      // You can get a free YouTube Data API v3 key from:
      // https://console.cloud.google.com/apis/credentials
      return NextResponse.json({ 
        duration: null,
        debug: {
          error: "YOUTUBE_API_KEY not configured",
          message: "Add YOUTUBE_API_KEY to your .env.local file"
        }
      });
    }

    console.log("[YouTube Duration API] API key found:", YOUTUBE_API_KEY.substring(0, 10) + "...");
    console.log("[YouTube Duration API] Making request to YouTube API for videoId:", videoId);

    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=contentDetails&key=${YOUTUBE_API_KEY}`;
    console.log("[YouTube Duration API] Request URL (key hidden):", apiUrl.replace(YOUTUBE_API_KEY, "***"));

    try {
      const response = await fetch(apiUrl, {
        next: { revalidate: 86400 }, // Cache for 24 hours
      });

      console.log("[YouTube Duration API] Response status:", response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[YouTube Duration API] YouTube API error response:");
        console.error("  Status:", response.status, response.statusText);
        console.error("  Body:", errorText);
        
        // Try to parse error JSON for more details
        try {
          const errorJson = JSON.parse(errorText);
          console.error("[YouTube Duration API] Parsed error:", JSON.stringify(errorJson, null, 2));
          
          // Check for common API errors
          if (errorJson.error) {
            const error = errorJson.error;
            console.error("[YouTube Duration API] Error details:");
            console.error("  Code:", error.code);
            console.error("  Message:", error.message);
            if (error.errors && Array.isArray(error.errors)) {
              error.errors.forEach((err: YouTubeApiError, index: number) => {
                console.error(`  Error ${index + 1}:`, err.domain, err.reason, err.message);
              });
            }
            
            // Provide helpful messages for common errors
            if (error.code === 403) {
              console.error("[YouTube Duration API] 403 Forbidden - Possible causes:");
              console.error("  1. API key is invalid or expired");
              console.error("  2. YouTube Data API v3 is not enabled in Google Cloud Console");
              console.error("  3. API key restrictions are blocking the request");
              console.error("     - If you restricted by HTTP referrer, server-side requests won't work");
              console.error("     - If you restricted by IP, ensure your server IP is allowed");
              console.error("     - Consider using 'IP addresses' restriction instead of 'HTTP referrers' for server-side APIs");
              console.error("  4. Quota exceeded (check Google Cloud Console)");
              
              // Check if it's a restriction issue
              if (error.errors && Array.isArray(error.errors)) {
                const restrictionError = error.errors.find((err: YouTubeApiError) => 
                  err.reason === "ipRefererBlocked" || 
                  err.reason === "refererNotAllowed" ||
                  err.reason === "accessNotConfigured"
                );
                if (restrictionError) {
                  console.error("[YouTube Duration API] ⚠️  API KEY RESTRICTION DETECTED:");
                  console.error("    This is a server-side API call. If you restricted your API key by:");
                  console.error("    - HTTP referrers: This won't work for server-side requests");
                  console.error("    - Application restrictions: Make sure 'None' or 'IP addresses' is selected");
                  console.error("    Solution: Update API key restrictions in Google Cloud Console to allow server IPs");
                }
              }
            } else if (error.code === 400) {
              console.error("[YouTube Duration API] 400 Bad Request - Possible causes:");
              console.error("  1. Invalid videoId format");
              console.error("  2. Missing required parameters");
            }
          }
        } catch {
          console.error("[YouTube Duration API] Could not parse error response as JSON");
        }
        
        // Check if it's an API key restriction issue
        let restrictionDetected = false;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error?.errors) {
            const restrictionError = errorJson.error.errors.find((err: YouTubeApiError) => 
              err.reason === "ipRefererBlocked" || 
              err.reason === "refererNotAllowed" ||
              err.reason === "accessNotConfigured"
            );
            if (restrictionError) {
              restrictionDetected = true;
            }
          }
        } catch {
          // Ignore parse errors
        }

        return NextResponse.json({ 
          duration: null,
          debug: {
            error: "YouTube API request failed",
            status: response.status,
            statusText: response.statusText,
            message: errorText.substring(0, 500), // Limit error text length
            restrictionIssue: restrictionDetected,
            note: restrictionDetected 
              ? "API key restrictions are blocking server-side requests. Use IP restrictions or create a separate key for server-side use."
              : undefined
          }
        });
      }

      const data = await response.json();
      console.log("[YouTube Duration API] Response data structure:", {
        hasItems: !!data.items,
        itemsLength: data.items?.length || 0,
        hasError: !!data.error
      });
      
      if (!data || !data.items) {
        console.warn("[YouTube Duration API] Unexpected response structure:", JSON.stringify(data, null, 2));
        return NextResponse.json({ 
          duration: null,
          debug: {
            error: "Unexpected response structure",
            response: data
          }
        });
      }

      if (data.items && data.items.length > 0) {
        const duration = data.items[0].contentDetails.duration; // ISO 8601 format (e.g., "PT2M15S")
        console.log("[YouTube Duration API] Raw duration string:", duration);
        
        // Parse ISO 8601 duration format: PT[#H][#M][#S]
        // Examples: "PT2M15S" = 2 minutes 15 seconds, "PT1H30M" = 1 hour 30 minutes
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (match) {
          const hours = parseInt(match[1] || "0", 10);
          const minutes = parseInt(match[2] || "0", 10);
          const seconds = parseInt(match[3] || "0", 10);
          const totalSeconds = hours * 3600 + minutes * 60 + seconds;
          
          console.log("[YouTube Duration API] Parsed duration:", {
            hours,
            minutes,
            seconds,
            totalSeconds
          });
          
          return NextResponse.json(
            { duration: totalSeconds },
            {
              headers: {
                'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
              },
            }
          );
        } else {
          console.warn("[YouTube Duration API] Could not parse duration string:", duration);
        }
      } else {
        console.warn("[YouTube Duration API] No items in response for videoId:", videoId);
      }

      return NextResponse.json({ 
        duration: null,
        debug: {
          error: "No duration found",
          videoId,
          responseItems: data.items?.length || 0
        }
      });
    } catch (fetchError) {
      console.error("[YouTube Duration API] Error fetching from YouTube API:", fetchError);
      if (fetchError instanceof Error) {
        console.error("[YouTube Duration API] Error message:", fetchError.message);
        console.error("[YouTube Duration API] Error stack:", fetchError.stack);
      }
      return NextResponse.json({ 
        duration: null,
        debug: {
          error: "Fetch error",
          message: fetchError instanceof Error ? fetchError.message : String(fetchError)
        }
      });
    }
  } catch (error) {
    console.error("[YouTube Duration API] Error in API route:", error);
    if (error instanceof Error) {
      console.error("[YouTube Duration API] Error message:", error.message);
      console.error("[YouTube Duration API] Error stack:", error.stack);
    }
    return NextResponse.json(
      { 
        error: "Failed to fetch video duration",
        debug: {
          message: error instanceof Error ? error.message : String(error)
        }
      },
      { status: 500 }
    );
  }
}

