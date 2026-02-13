import { NextResponse } from "next/server";
import { getJustWatchCountries } from "@/lib/justwatch";

export async function GET() {
  try {
    const token = process.env.JUSTWATCH_TOKEN ?? process.env.JUSTWATCH_API_KEY;
    if (!token) {
      return NextResponse.json({ error: "JustWatch token not configured" }, { status: 503 });
    }
    const countries = await getJustWatchCountries();
    return NextResponse.json(countries, {
      headers: { "Cache-Control": "s-maxage=86400, stale-while-revalidate=3600" },
    });
  } catch (error) {
    console.error("[JustWatch countries]", error);
    return NextResponse.json({ error: "Failed to fetch countries" }, { status: 500 });
  }
}
