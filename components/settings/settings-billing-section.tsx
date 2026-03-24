"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  BadgeCheck,
  CreditCard,
  Download,
  FileText,
  LayoutDashboard,
  Loader2,
  Mail,
  Printer,
  Receipt,
  Scale,
  Sparkles,
  AlertTriangle,
  ExternalLink,
  Calendar,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { PRO_PRICE_USD_MONTHLY, DEFAULT_FREE_CHAT_LIMIT } from "@/lib/billing";
import {
  hasActiveProSubscription,
  subscriptionNeedsPaymentAction,
} from "@/lib/subscription";

type InvoiceApiRow = {
  id: string;
  number: string | null;
  created: number;
  description: string;
  amountDue: number;
  amountPaid: number;
  currency: string;
  status: string | null;
  invoicePdf: string | null;
  hostedInvoiceUrl: string | null;
};

function formatMoney(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

function invoiceStatusBadge(status: string | null) {
  switch (status) {
    case "paid":
      return (
        <Badge variant="secondary" className="font-normal">
          Paid
        </Badge>
      );
    case "open":
      return (
        <Badge
          variant="outline"
          className="font-normal text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-900"
        >
          Open
        </Badge>
      );
    case "void":
      return (
        <Badge variant="outline" className="font-normal">
          Void
        </Badge>
      );
    case "uncollectible":
      return (
        <Badge variant="destructive" className="font-normal">
          Uncollectible
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="font-normal">
          {status ?? "—"}
        </Badge>
      );
  }
}

type BillingSummaryResponse = {
  billingCycle: {
    periodStart: string | null;
    periodEnd: string | null;
    interval: string | null;
  };
  upcoming: {
    amountDue: number;
    currency: string;
    nextPaymentAttempt: number | null;
    periodEnd: number | null;
  } | null;
};

interface SettingsBillingSectionProps {
  userEmail: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeSubscriptionStatus: string | null;
  stripeSubscriptionCurrentPeriodStart: string | null;
  stripeSubscriptionCurrentPeriodEnd: string | null;
  aiChatQuestionCount: number;
  aiChatMaxQuestions: number;
}

export function SettingsBillingSection({
  userEmail,
  stripeCustomerId,
  stripeSubscriptionId,
  stripeSubscriptionStatus,
  stripeSubscriptionCurrentPeriodStart,
  stripeSubscriptionCurrentPeriodEnd,
  aiChatQuestionCount,
  aiChatMaxQuestions,
}: SettingsBillingSectionProps) {
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceApiRow[] | null>(null);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [billingSummary, setBillingSummary] = useState<BillingSummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const isPro = hasActiveProSubscription(stripeSubscriptionStatus);
  const paymentProblem = subscriptionNeedsPaymentAction(stripeSubscriptionStatus);
  const isTrialing = stripeSubscriptionStatus === "trialing";

  const renewalLabel = stripeSubscriptionCurrentPeriodEnd
    ? format(new Date(stripeSubscriptionCurrentPeriodEnd), "PPP")
    : null;

  const isUnlimited = aiChatMaxQuestions === -1;
  const effectiveLimit = isUnlimited ? DEFAULT_FREE_CHAT_LIMIT : aiChatMaxQuestions;
  const usagePct =
    isUnlimited || effectiveLimit <= 0
      ? 100
      : Math.min(100, Math.round((aiChatQuestionCount / effectiveLimit) * 100));

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (checkout === "success") {
      toast.success("Subscription updated. If changes don’t show yet, refresh in a moment.");
    } else if (checkout === "canceled") {
      toast.info("Checkout canceled.");
    }
  }, []);

  const openPortal = useCallback(async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Could not open billing portal");
      }
      if (data.url) {
        window.location.href = data.url as string;
        return;
      }
      throw new Error("No portal URL");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open billing portal");
    } finally {
      setPortalLoading(false);
    }
  }, []);

  const startCheckout = useCallback(async () => {
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Could not start checkout");
      }
      if (data.url) {
        window.location.href = data.url as string;
        return;
      }
      throw new Error("No checkout URL");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setCheckoutLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!stripeCustomerId) {
        setInvoices([]);
        return;
      }
      setInvoicesLoading(true);
      try {
        const res = await fetch("/api/billing/invoices");
        const data = await res.json();
        if (!cancelled && res.ok && Array.isArray(data.invoices)) {
          setInvoices(data.invoices);
        } else if (!cancelled) {
          setInvoices([]);
        }
      } catch {
        if (!cancelled) setInvoices([]);
      } finally {
        if (!cancelled) setInvoicesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [stripeCustomerId]);

  useEffect(() => {
    if (!isPro || !stripeCustomerId) {
      setBillingSummary(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setSummaryLoading(true);
      try {
        const res = await fetch("/api/billing/summary");
        const data = await res.json();
        if (!cancelled && res.ok && data.billingCycle) {
          setBillingSummary(data as BillingSummaryResponse);
        } else if (!cancelled) {
          setBillingSummary(null);
        }
      } catch {
        if (!cancelled) setBillingSummary(null);
      } finally {
        if (!cancelled) setSummaryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isPro, stripeCustomerId, stripeSubscriptionId]);

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Billing</h2>
        <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
          Pro is <span className="text-foreground font-medium">${PRO_PRICE_USD_MONTHLY}/month</span> and includes
          unlimited AI chat, an ad-free experience across pages, and other advanced features as we ship them.
        </p>
      </div>

      <Tabs defaultValue="overview" className="w-full gap-6">
        <TabsList className="grid w-full h-auto grid-cols-1 gap-1 p-1 sm:grid-cols-3 sm:gap-0">
          <TabsTrigger value="overview" className="gap-2 py-2.5 sm:py-2">
            <LayoutDashboard className="size-4 shrink-0 opacity-70" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-2 py-2.5 sm:py-2">
            <Receipt className="size-4 shrink-0 opacity-70" />
            {"Invoices & payments"}
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2 py-2.5 sm:py-2">
            <Scale className="size-4 shrink-0 opacity-70" />
            {"Documents & support"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0 space-y-6 outline-none">
          {paymentProblem && (
            <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
              <AlertTriangle className="size-4" />
              <AlertTitle>Payment failed</AlertTitle>
              <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  We couldn&apos;t charge your default card. Update your payment method to keep Pro access.
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 border-destructive/40 cursor-pointer"
                  disabled={portalLoading || !stripeCustomerId}
                  onClick={() => openPortal()}
                >
                  {portalLoading ? <Loader2 className="size-4 animate-spin" /> : "Update payment method"}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="shadow-none gap-0 py-0 overflow-hidden">
              <CardHeader className="border-b bg-muted/30 px-5 py-4 space-y-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-semibold">Current plan</CardTitle>
                    <CardDescription className="text-xs mt-1">What you&apos;re subscribed to today</CardDescription>
                  </div>
                  {isPro ? (
                    <Badge className="shrink-0 font-medium">{isTrialing ? "Pro (trial)" : "Pro"}</Badge>
                  ) : (
                    <Badge variant="outline" className="shrink-0 font-medium">
                      Free
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="px-5 py-5 space-y-4">
                <div>
                  <p className="text-2xl font-semibold tracking-tight tabular-nums">
                    {isPro ? `$${PRO_PRICE_USD_MONTHLY}` : "$0"}
                    <span className="text-sm font-normal text-muted-foreground"> / month</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isPro && renewalLabel
                      ? `${isTrialing ? "Trial converts or renews" : "Renews"} on ${renewalLabel}`
                      : `Upgrade for $${PRO_PRICE_USD_MONTHLY}/mo — AI chat and more`}
                  </p>
                  {stripeSubscriptionId && !isPro && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Status: {stripeSubscriptionStatus ?? "unknown"}
                    </p>
                  )}
                </div>
                <Separator />
                <ul className="space-y-2.5 text-sm">
                  <li className="flex gap-2">
                    <BadgeCheck className="size-4 shrink-0 text-primary mt-0.5" />
                    <span>
                      <span className="font-medium text-foreground">AI chat</span>
                      <span className="text-muted-foreground">
                        {" "}
                        — Ask Us on title details and AI chat in the dashboard;{" "}
                        {isPro ? "unlimited" : "limited on Free (see usage)"}
                      </span>
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <BadgeCheck
                      className={cn("size-4 shrink-0 mt-0.5", isPro ? "text-primary" : "text-muted-foreground/40")}
                    />
                    <span className={cn(!isPro && "text-muted-foreground/80")}>
                      <span className="font-medium text-foreground">Ad-free browsing</span>
                      <span className="text-muted-foreground"> — no ads on pages (Pro)</span>
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <BadgeCheck className="size-4 shrink-0 text-primary mt-0.5" />
                    <span className="text-muted-foreground">Catalog, lists, diary, and core product features</span>
                  </li>
                  <li className="flex gap-2">
                    <BadgeCheck
                      className={cn("size-4 shrink-0 mt-0.5", isPro ? "text-primary" : "text-muted-foreground/40")}
                    />
                    <span className={cn(!isPro && "text-muted-foreground/80")}>
                      Additional advanced features as we add them (included in Pro)
                    </span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter className="flex flex-col gap-2 border-t bg-muted/20 px-5 py-4 sm:flex-row sm:justify-end">
                {!isPro ? (
                  <Button
                    className="w-full sm:w-auto cursor-pointer gap-2 bg-[#006DCA] hover:bg-[#0056A3] text-white"
                    onClick={() => startCheckout()}
                    disabled={checkoutLoading}
                  >
                    {checkoutLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Sparkles className="size-4" />
                    )}
                    Upgrade to Pro
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full sm:ml-auto sm:w-auto cursor-pointer gap-2"
                    onClick={() => openPortal()}
                    disabled={portalLoading || !stripeCustomerId}
                  >
                    {portalLoading ? <Loader2 className="size-4 animate-spin" /> : <ExternalLink className="size-4" />}
                    Manage subscription
                  </Button>
                )}
              </CardFooter>
            </Card>

            <Card className="shadow-none gap-0 py-0 overflow-hidden">
              <CardHeader className="border-b bg-muted/30 px-5 py-4 space-y-1">
                <CardTitle className="text-base font-semibold">Usage</CardTitle>
                <CardDescription className="text-xs">
                  {isUnlimited
                    ? "Pro includes unlimited AI chat for eligible features."
                    : "AI messages used toward your current limit (same rules as Ask Us on title pages)."}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-5 py-5 space-y-4">
                <div>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium">{"AI chat (details & dashboard)"}</span>
                    <span className="text-muted-foreground tabular-nums text-right">
                      {isUnlimited
                        ? "Unlimited"
                        : `${aiChatQuestionCount} of ${effectiveLimit} used`}
                    </span>
                  </div>
                  {!isUnlimited && <Progress value={usagePct} className="mt-3 h-2" />}
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    {isUnlimited
                      ? "Your plan includes unlimited AI chat where the product supports it."
                      : `Free tier defaults to ${DEFAULT_FREE_CHAT_LIMIT} messages unless an admin sets a custom quota. Pro ($${PRO_PRICE_USD_MONTHLY}/mo) removes this cap via Stripe.`}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-none gap-0 py-0 overflow-hidden">
            <CardHeader className="border-b bg-muted/30 px-5 py-4">
              <div className="flex items-center gap-2">
                <CreditCard className="size-4 text-muted-foreground" />
                <CardTitle className="text-base font-semibold">Payment method</CardTitle>
              </div>
              <CardDescription className="text-xs">Cards and invoices are managed in your secure Stripe billing portal</CardDescription>
            </CardHeader>
            <CardContent className="px-5 py-5">
              {stripeCustomerId ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Update cards, view invoices, and cancel your plan in the billing portal.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="cursor-pointer shrink-0"
                    onClick={() => openPortal()}
                    disabled={portalLoading}
                  >
                    {portalLoading ? <Loader2 className="size-4 animate-spin" /> : "Open billing portal"}
                  </Button>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-center">
                  <p className="text-sm font-medium text-foreground">No card on file</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                    A payment method is added when you subscribe to Pro.
                  </p>
                  {!isPro && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-4 cursor-pointer"
                      onClick={() => startCheckout()}
                      disabled={checkoutLoading}
                    >
                      {checkoutLoading ? <Loader2 className="size-4 animate-spin" /> : "Subscribe to Pro"}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-none gap-0 py-0 overflow-hidden">
            <CardHeader className="border-b bg-muted/30 px-5 py-4">
              <div className="flex items-center gap-2">
                <Mail className="size-4 text-muted-foreground" />
                <CardTitle className="text-base font-semibold">Billing email</CardTitle>
              </div>
              <CardDescription className="text-xs">Receipts and invoice notifications are sent here</CardDescription>
            </CardHeader>
            <CardContent className="px-5 py-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium break-all">{userEmail}</p>
              <Button variant="link" className="h-auto p-0 text-sm cursor-pointer" asChild>
                <Link href="/settings?section=account">Change in Account</Link>
              </Button>
            </CardContent>
          </Card>

          <div
            className={cn(
              "rounded-xl border p-5",
              isPro ? "border-destructive/25 bg-destructive/[0.03]" : "border-border bg-muted/20",
            )}
          >
            <h3 className="text-sm font-semibold text-foreground">Cancel or change plan</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
              {isPro
                ? "Use the Stripe customer portal to cancel, switch billing interval, or update payment details."
                : "You don’t have an active Pro subscription."}
            </p>
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                disabled={!isPro || !stripeCustomerId || portalLoading}
                onClick={() => openPortal()}
              >
                {portalLoading ? <Loader2 className="size-4 animate-spin" /> : "Open billing portal"}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="invoices" className="mt-0 space-y-4 outline-none">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="shadow-none gap-0 py-0 overflow-hidden">
              <CardHeader className="border-b bg-muted/30 px-5 py-4 space-y-1">
                <div className="flex items-center gap-2">
                  <Calendar className="size-4 text-muted-foreground" />
                  <CardTitle className="text-base font-semibold">Billing cycle</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Current subscription period (from Stripe). Dates use your plan’s renewal window.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-5 py-5 space-y-3 text-sm">
                {summaryLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  </div>
                ) : isPro &&
                  (billingSummary?.billingCycle?.periodStart ||
                    stripeSubscriptionCurrentPeriodStart ||
                    billingSummary?.billingCycle?.periodEnd ||
                    stripeSubscriptionCurrentPeriodEnd) ? (
                  <>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Period start</span>
                      <span className="font-medium tabular-nums text-right">
                        {(billingSummary?.billingCycle?.periodStart || stripeSubscriptionCurrentPeriodStart)
                          ? format(
                              new Date(
                                (billingSummary?.billingCycle?.periodStart ||
                                  stripeSubscriptionCurrentPeriodStart)!,
                              ),
                              "PPP",
                            )
                          : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Period end</span>
                      <span className="font-medium tabular-nums text-right">
                        {(billingSummary?.billingCycle?.periodEnd || stripeSubscriptionCurrentPeriodEnd)
                          ? format(
                              new Date(
                                (billingSummary?.billingCycle?.periodEnd || stripeSubscriptionCurrentPeriodEnd)!,
                              ),
                              "PPP",
                            )
                          : "—"}
                      </span>
                    </div>
                    {billingSummary?.billingCycle?.interval && (
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Plan interval</span>
                        <span className="font-medium text-right">{billingSummary.billingCycle.interval}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {isPro
                      ? "Cycle details will appear after the next webhook sync, or open the billing portal."
                      : "Subscribe to Pro to see your billing cycle here."}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-none gap-0 py-0 overflow-hidden">
              <CardHeader className="border-b bg-muted/30 px-5 py-4 space-y-1">
                <div className="flex items-center gap-2">
                  <Receipt className="size-4 text-muted-foreground" />
                  <CardTitle className="text-base font-semibold">Upcoming payment</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Next charge from your subscription (preview from Stripe).
                </CardDescription>
              </CardHeader>
              <CardContent className="px-5 py-5 space-y-3 text-sm">
                {summaryLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  </div>
                ) : billingSummary?.upcoming && billingSummary.upcoming.amountDue >= 0 ? (
                  <>
                    <div className="flex justify-between gap-4 items-baseline">
                      <span className="text-muted-foreground">Amount due</span>
                      <span className="text-lg font-semibold tabular-nums">
                        {formatMoney(billingSummary.upcoming.amountDue, billingSummary.upcoming.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Payment date</span>
                      <span className="font-medium text-right">
                        {billingSummary.upcoming.nextPaymentAttempt
                          ? format(new Date(billingSummary.upcoming.nextPaymentAttempt * 1000), "PPP")
                          : billingSummary.upcoming.periodEnd
                            ? format(new Date(billingSummary.upcoming.periodEnd * 1000), "PPP")
                            : renewalLabel || "—"}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {isPro
                      ? "No upcoming invoice preview right now (e.g. trial or sync pending). Check the portal for details."
                      : "Upcoming charges appear here when you have an active Pro subscription."}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-none py-0 gap-0 overflow-hidden">
            <CardHeader className="border-b bg-muted/30 px-5 py-4 space-y-1">
              <CardTitle className="text-base font-semibold">Invoice history</CardTitle>
              <CardDescription className="text-xs">
                Download PDFs or open Stripe’s hosted invoice. Requires an active Stripe customer (after you subscribe).
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 py-0">
              {invoicesLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="size-8 animate-spin text-muted-foreground" />
                </div>
              ) : !stripeCustomerId || !invoices?.length ? (
                <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No invoices yet. They will appear here after your first payment.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b bg-muted/20">
                      <TableHead className="h-11 px-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Date
                      </TableHead>
                      <TableHead className="h-11 px-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Description
                      </TableHead>
                      <TableHead className="h-11 px-4 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Amount
                      </TableHead>
                      <TableHead className="h-11 px-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Status
                      </TableHead>
                      <TableHead className="h-11 px-4 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground w-[1%]">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((inv) => {
                      const dateStr = format(new Date(inv.created * 1000), "MMM d, yyyy");
                      const amount = inv.amountPaid > 0 ? inv.amountPaid : inv.amountDue;
                      return (
                        <TableRow key={inv.id}>
                          <TableCell className="px-4 py-3 text-sm text-muted-foreground tabular-nums">{dateStr}</TableCell>
                          <TableCell className="px-4 py-3 text-sm font-medium max-w-[200px] truncate">
                            {inv.description}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-sm text-right tabular-nums">
                            {formatMoney(amount, inv.currency)}
                          </TableCell>
                          <TableCell className="px-4 py-3">{invoiceStatusBadge(inv.status)}</TableCell>
                          <TableCell className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              {inv.invoicePdf && (
                                <Button variant="ghost" size="icon" className="size-8 cursor-pointer" asChild>
                                  <a href={inv.invoicePdf} target="_blank" rel="noopener noreferrer" title="Download PDF">
                                    <Download className="size-4" />
                                  </a>
                                </Button>
                              )}
                              {inv.hostedInvoiceUrl && (
                                <Button variant="ghost" size="icon" className="size-8 cursor-pointer" asChild>
                                  <a href={inv.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer" title="View invoice">
                                    <ExternalLink className="size-4" />
                                  </a>
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
            <CardFooter className="border-t bg-muted/10 px-5 py-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tax and invoice numbers match what Stripe issued for your account.
              </p>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-0 space-y-4 outline-none">
          <Card className="shadow-none gap-0 py-0 overflow-hidden">
            <CardHeader className="border-b bg-muted/30 px-5 py-4 space-y-1">
              <CardTitle className="text-base font-semibold">Policies</CardTitle>
              <CardDescription className="text-xs">Review or print our legal pages from your browser</CardDescription>
            </CardHeader>
            <CardContent className="px-5 py-2 divide-y">
              <Link
                href="/terms"
                className="flex items-center justify-between gap-3 py-3 text-sm font-medium hover:text-primary transition-colors group"
              >
                <span className="flex items-center gap-2">
                  <FileText className="size-4 text-muted-foreground group-hover:text-primary" />
                  Terms of Service
                </span>
                <span className="text-xs text-muted-foreground shrink-0">Includes refund policy</span>
              </Link>
              <Link
                href="/privacy"
                className="flex items-center justify-between gap-3 py-3 text-sm font-medium hover:text-primary transition-colors group"
              >
                <span className="flex items-center gap-2">
                  <FileText className="size-4 text-muted-foreground group-hover:text-primary" />
                  Privacy Policy
                </span>
              </Link>
            </CardContent>
          </Card>

          <Card className="shadow-none gap-0 py-0 overflow-hidden">
            <CardHeader className="border-b bg-muted/30 px-5 py-4 space-y-1">
              <CardTitle className="text-base font-semibold">{"Printing & saving"}</CardTitle>
              <CardDescription className="text-xs">Documents you can save or print</CardDescription>
            </CardHeader>
            <CardContent className="px-5 py-5 space-y-3 text-sm text-muted-foreground leading-relaxed">
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <span className="text-foreground font-medium">Invoices</span> — PDF downloads from the table above (via
                  Stripe).
                </li>
                <li>
                  <span className="text-foreground font-medium">Receipts</span> — usually the same PDF as the invoice for
                  card payments.
                </li>
                <li>
                  <span className="text-foreground font-medium">Policies</span> — open Terms or Privacy, then use your
                  browser&apos;s print dialog (Ctrl+P / ⌘P).
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-none gap-0 py-0 overflow-hidden border-primary/15 bg-primary/[0.04]">
            <CardHeader className="px-5 py-4 space-y-1">
              <CardTitle className="text-base font-semibold">Billing support</CardTitle>
              <CardDescription className="text-xs">Questions about charges, receipts, or your plan</CardDescription>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <Button variant="outline" className="cursor-pointer" asChild>
                <a href="mailto:support@what2watch.net?subject=Billing%20question">Email support@what2watch.net</a>
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                Include the invoice date and last four digits of the card if your question is about a specific charge.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
