import Link from "next/link";
import { getSitemapEntries, groupEntriesByCategory } from "@/lib/sitemap/entries";

export const revalidate = 3600;

export default async function SitemapPage() {
  const entries = await getSitemapEntries();
  const grouped = groupEntriesByCategory(entries);

  const categoryOrder = [
    "Main pages",
    "Movies & TV",
    "Public lists",
    "Forum",
    "Public playlists",
    "Link pages",
    "Other",
  ];

  const sections = categoryOrder
    .filter((name) => grouped.has(name))
    .map((name) => ({ name, items: grouped.get(name)! }));

  for (const [name, items] of grouped) {
    if (!categoryOrder.includes(name)) {
      sections.push({ name, items });
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 max-w-5xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-primary mb-2">Site index</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Sitemap</h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            {entries.length.toLocaleString()} public URLs we submit to search engines.
            Movie and TV pages appear here when they are included in public lists.
            Other titles can still be found via search and internal links.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Machine-readable feed:{" "}
            <Link href="/sitemap.xml" className="text-primary hover:underline">
              /sitemap.xml
            </Link>
          </p>
        </div>

        <div className="space-y-10">
          {sections.map((section) => (
            <section key={section.name}>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                {section.name}
                <span className="text-sm font-normal text-muted-foreground">
                  ({section.items.length.toLocaleString()})
                </span>
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {section.items.map((entry) => {
                  const path = entry.url.replace(/^https?:\/\/[^/]+/, "") || "/";
                  const label = path === "/" ? "Home" : path;
                  return (
                    <li key={entry.url}>
                      <Link
                        href={path}
                        className="block rounded-lg border border-border/60 bg-card/40 px-3 py-2 text-sm hover:border-primary/40 hover:bg-card transition-colors"
                      >
                        <span className="line-clamp-2 break-all">{label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
