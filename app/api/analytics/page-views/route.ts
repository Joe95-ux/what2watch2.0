import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

const VISITOR_COOKIE_NAME = "w2w_vid";
const SESSION_COOKIE_NAME = "w2w_sid";
const VISITOR_COOKIE_MAX_AGE_DAYS = 365;
const SESSION_COOKIE_MAX_AGE_HOURS = 24;
const VISIT_DEDUP_WINDOW_SECONDS = 30; // Prevent duplicate page views within 30 seconds

// Extract domain from URL
function extractDomain(url: string | null): string | null {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// Get IP address from request
function getIpAddress(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfConnectingIp = request.headers.get("cf-connecting-ip"); // Cloudflare
  const ip = cfConnectingIp || forwarded?.split(",")[0]?.trim() || realIp || null;
  return ip;
}

// Hash IP for privacy
function hashIp(ip: string): string {
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// Get geolocation from IP (using a free service)
async function getGeolocation(ip: string | null): Promise<{
  country?: string;
  countryName?: string;
  region?: string;
  city?: string;
} | null> {
  if (!ip) return null;
  
  try {
    // Using ip-api.com (free tier: 45 requests/minute)
    // Alternative: Use a paid service like MaxMind GeoIP2 or Cloudflare headers
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,regionName,city`, {
      headers: {
        "Accept": "application/json",
      },
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (data.status === "success") {
      return {
        country: data.countryCode || null,
        countryName: data.country || null,
        region: data.regionName || null,
        city: data.city || null,
      };
    }
  } catch (error) {
    console.error("Geolocation error:", error);
  }
  
  return null;
}

// Parse user agent
function parseUserAgent(userAgent: string | null): {
  deviceType?: string;
  browser?: string;
  os?: string;
} {
  if (!userAgent) return {};
  
  const ua = userAgent.toLowerCase();
  
  // Device type
  let deviceType = "desktop";
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    deviceType = "mobile";
  } else if (/tablet|ipad|playbook|silk/i.test(ua)) {
    deviceType = "tablet";
  }
  
  // Browser
  let browser: string | undefined;
  if (ua.includes("chrome") && !ua.includes("edg")) browser = "Chrome";
  else if (ua.includes("firefox")) browser = "Firefox";
  else if (ua.includes("safari") && !ua.includes("chrome")) browser = "Safari";
  else if (ua.includes("edg")) browser = "Edge";
  else if (ua.includes("opera") || ua.includes("opr")) browser = "Opera";
  
  // OS
  let os: string | undefined;
  if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("mac os")) os = "macOS";
  else if (ua.includes("linux")) os = "Linux";
  else if (ua.includes("android")) os = "Android";
  else if (ua.includes("ios") || ua.includes("iphone") || ua.includes("ipad")) os = "iOS";
  
  return { deviceType, browser, os };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, route, title } = body;
    
    if (!path) {
      return NextResponse.json(
        { error: "Path is required" },
        { status: 400 }
      );
    }
    
    const { userId: clerkUserId } = await auth();
    
    // Get or create visitor token
    const cookieStoreResult = cookies();
    const cookieStore =
      cookieStoreResult instanceof Promise
        ? await cookieStoreResult
        : cookieStoreResult;
    
    let visitorToken = cookieStore.get(VISITOR_COOKIE_NAME)?.value;
    let sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    let shouldSetVisitorCookie = false;
    let shouldSetSessionCookie = false;
    
    if (!visitorToken) {
      visitorToken = randomUUID();
      shouldSetVisitorCookie = true;
    }
    
    if (!sessionId) {
      sessionId = randomUUID();
      shouldSetSessionCookie = true;
    }
    
    // Get user if authenticated
    const user = clerkUserId
      ? await db.user.findUnique({
          where: { clerkId: clerkUserId },
          select: { id: true },
        })
      : null;
    
    // Deduplicate: Check if same page was viewed recently by same visitor
    const dedupeWindowStart = new Date(
      Date.now() - VISIT_DEDUP_WINDOW_SECONDS * 1000
    );
    
    const recentView = await db.pageView.findFirst({
      where: {
        path,
        visitorToken,
        createdAt: { gte: dedupeWindowStart },
      },
    });
    
    if (recentView) {
      const response = NextResponse.json({ success: true, deduped: true });
      if (shouldSetVisitorCookie && visitorToken) {
        response.cookies.set({
          name: VISITOR_COOKIE_NAME,
          value: visitorToken,
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: VISITOR_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60,
        });
      }
      if (shouldSetSessionCookie && sessionId) {
        response.cookies.set({
          name: SESSION_COOKIE_NAME,
          value: sessionId,
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: SESSION_COOKIE_MAX_AGE_HOURS * 60 * 60,
        });
      }
      return response;
    }
    
    // Extract request data
    const referrer = request.headers.get("referer") || null;
    const referrerDomain = extractDomain(referrer);
    const userAgent = request.headers.get("user-agent") || null;
    const rawIp = getIpAddress(request);
    const ipAddress = rawIp ? hashIp(rawIp) : null; // Hash IP for privacy
    
    // Parse UTM parameters from URL
    const url = new URL(request.url);
    const utmSource = url.searchParams.get("utm_source") || null;
    const utmMedium = url.searchParams.get("utm_medium") || null;
    const utmCampaign = url.searchParams.get("utm_campaign") || null;
    const utmTerm = url.searchParams.get("utm_term") || null;
    const utmContent = url.searchParams.get("utm_content") || null;
    
    // Get geolocation (async, don't block on failure)
    const geo = await getGeolocation(rawIp);
    
    // Parse user agent
    const uaInfo = parseUserAgent(userAgent);
    
    // Create page view
    await db.pageView.create({
      data: {
        userId: user?.id || null,
        path,
        route: route || null,
        title: title || null,
        visitorToken,
        sessionId,
        referrer,
        referrerDomain,
        utmSource,
        utmMedium,
        utmCampaign,
        utmTerm,
        utmContent,
        country: geo?.country || null,
        countryName: geo?.countryName || null,
        region: geo?.region || null,
        city: geo?.city || null,
        ipAddress,
        userAgent,
        deviceType: uaInfo.deviceType || null,
        browser: uaInfo.browser || null,
        os: uaInfo.os || null,
      },
    });
    
    const response = NextResponse.json({ success: true });
    
    // Set cookies
    if (shouldSetVisitorCookie && visitorToken) {
      response.cookies.set({
        name: VISITOR_COOKIE_NAME,
        value: visitorToken,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: VISITOR_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60,
      });
    }
    if (shouldSetSessionCookie && sessionId) {
      response.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: sessionId,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_COOKIE_MAX_AGE_HOURS * 60 * 60,
      });
    }
    
    return response;
  } catch (error) {
    console.error("Page view tracking error:", error);
    return NextResponse.json(
      { error: "Failed to track page view" },
      { status: 500 }
    );
  }
}

