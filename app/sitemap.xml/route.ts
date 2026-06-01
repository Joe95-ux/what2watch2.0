import { entriesToSitemapXml, getSitemapEntries } from "@/lib/sitemap/entries";

export const revalidate = 3600;

export async function GET() {
  const entries = await getSitemapEntries();
  const xml = entriesToSitemapXml(entries);

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
