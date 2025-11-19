"use client";

import Image from "next/image";
import { JustWatchAvailabilityResponse, JustWatchOffer } from "@/lib/justwatch";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface WatchBreakdownSectionProps {
  availability: JustWatchAvailabilityResponse | null | undefined;
  isLoading: boolean;
}

const sections: Array<{
  key: keyof JustWatchAvailabilityResponse["offersByType"];
  title: string;
  description: string;
  ctaLabel: string;
}> = [
  { key: "flatrate", title: "Streaming", description: "Included with subscription", ctaLabel: "Open App" },
  { key: "ads", title: "With Ads", description: "Free with ads", ctaLabel: "Watch Free" },
  { key: "free", title: "Free to Watch", description: "Completely free sources", ctaLabel: "Start Watching" },
  { key: "rent", title: "Rent", description: "Pay once, limited time access", ctaLabel: "Rent" },
  { key: "buy", title: "Buy", description: "Purchase to own", ctaLabel: "Buy" },
];

export default function WatchBreakdownSection({ availability, isLoading }: WatchBreakdownSectionProps) {
  if (isLoading) {
    return (
      <section className="py-12 space-y-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </section>
    );
  }

  if (!availability) {
    return (
      <section className="py-12">
        <p className="text-muted-foreground text-center">
          We couldn&apos;t load real-time availability right now. Please try again later.
        </p>
      </section>
    );
  }

  return (
    <section className="py-12 space-y-8" id="watch">
      <div>
        <h2 className="text-2xl font-bold mb-2">Where to Watch</h2>
        <p className="text-sm text-muted-foreground">
          Real-time availability for {availability.country}
          {availability.lastSyncedAt ? ` • Updated ${new Date(availability.lastSyncedAt).toLocaleDateString()}` : ""}
        </p>
      </div>

      {sections.map((section) => {
        const offers = availability.offersByType[section.key] || [];
        if (!offers.length) return null;
        return (
          <div key={section.key} className="space-y-3">
            <div>
              <h3 className="text-xl font-semibold">{section.title}</h3>
              <p className="text-sm text-muted-foreground">{section.description}</p>
            </div>
            <div className="divide-y divide-border rounded-2xl border border-border bg-card/30">
              {offers.map((offer) => (
                <OfferRow key={`${offer.providerId}-${offer.monetizationType}`} offer={offer} ctaLabel={section.ctaLabel} />
              ))}
            </div>
          </div>
        );
      })}

      <JustWatchCredit />
    </section>
  );
}

function OfferRow({ offer, ctaLabel }: { offer: JustWatchOffer; ctaLabel: string }) {
  const displayPrice =
    offer.retailPrice && offer.currency
      ? new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: offer.currency,
          maximumFractionDigits: 2,
        }).format(offer.retailPrice)
      : null;

  return (
    <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {offer.iconUrl ? (
          <Image src={offer.iconUrl} alt={offer.providerName} width={32} height={32} className="rounded-md" unoptimized />
        ) : (
          <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">
            {offer.providerName[0]}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-medium truncate">{offer.providerName}</p>
          <p className="text-sm text-muted-foreground capitalize">
            {offer.monetizationType}
            {offer.presentationType ? ` • ${offer.presentationType.toUpperCase()}` : ""}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4">
          {displayPrice ? (
            <span className="text-sm font-medium text-foreground">{displayPrice}</span>
          ) : (
            <span className="text-sm text-muted-foreground">Included</span>
          )}
        <Button
          size="sm"
          variant="outline"
          asChild
          disabled={!offer.standardWebUrl && !offer.deepLinkUrl}
        >
          <a href={offer.deepLinkUrl ?? offer.standardWebUrl ?? "#"} target="_blank" rel="noopener noreferrer">
            {ctaLabel}
          </a>
        </Button>
      </div>
    </div>
  );
}

function JustWatchCredit() {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Image
        src="https://widget.justwatch.com/assets/JW_logo_color_10px.svg"
        alt="JustWatch"
        width={66}
        height={10}
        unoptimized
      />
      <span>Data powered by JustWatch</span>
    </div>
  );
}

