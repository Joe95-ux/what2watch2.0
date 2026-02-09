"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Link2, ExternalLink, Settings, MousePointer } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";

type LinkItem = {
  id: string;
  label: string;
  url: string;
  order: number;
  isActive: boolean;
  clicks: number;
};

export function LinkPageAnalyticsContent() {
  const { data: currentUser } = useCurrentUser();

  const { data, isLoading } = useQuery({
    queryKey: ["user-links-analytics"],
    queryFn: async () => {
      const res = await fetch("/api/user/links");
      if (!res.ok) throw new Error("Failed to fetch links");
      return res.json() as Promise<{ links: LinkItem[] }>;
    },
  });

  const links = data?.links ?? [];
  const totalClicks = links.reduce((sum, l) => sum + (l.clicks ?? 0), 0);

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Link page analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Clicks on each link from your public link page.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {currentUser?.username && (
            <Button variant="outline" size="sm" asChild className="cursor-pointer">
              <Link href={`/links/${currentUser.username}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                View link page
              </Link>
            </Button>
          )}
          <Button variant="outline" size="sm" asChild className="cursor-pointer">
            <Link href="/settings?section=links">
              <Settings className="h-4 w-4 mr-2" />
              Edit links
            </Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Link</TableHead>
                <TableHead className="w-[120px] text-right">Clicks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3].map((i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-5 w-12 ml-auto" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : links.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <Link2 className="h-12 w-12 text-muted-foreground mx-auto mb-3 block" />
          <p className="font-medium text-muted-foreground">No links yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add links in Settings to see click analytics here.
          </p>
          <Button asChild className="mt-4 cursor-pointer">
            <Link href="/settings?section=links">Go to Link in bio settings</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Link</TableHead>
                <TableHead className="text-right w-[120px]">Clicks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map((link) => (
                <TableRow key={link.id}>
                  <TableCell>
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium truncate">{link.label}</span>
                      <span className="text-xs text-muted-foreground truncate max-w-[280px] sm:max-w-none" title={link.url}>
                        {link.url}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <MousePointer className="h-4 w-4 text-muted-foreground" />
                      {link.clicks ?? 0}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="border-t px-4 py-3 flex justify-end">
            <span className="text-sm text-muted-foreground">
              Total clicks: <span className="font-medium text-foreground">{totalClicks}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
