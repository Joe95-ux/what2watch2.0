import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function BrowseViewAllLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer"
    >
      View All
      <ChevronRight className="h-4 w-4" />
    </Link>
  );
}
