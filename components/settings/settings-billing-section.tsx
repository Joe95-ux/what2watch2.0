"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  BadgeCheck,
  CreditCard,
  Download,
  FileText,
  LayoutDashboard,
  Mail,
  Printer,
  Receipt,
  Scale,
  Sparkles,
  AlertTriangle,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { PRO_PRICE_USD_MONTHLY } from "@/lib/billing";

/** Pre-Stripe: swap to live subscription state from your API. */
const MOCK_PLAN: "free" | "pro" = "free";

const MOCK_USAGE = { used: 2, limit: 6 };

type InvoiceRow = {
  id: string;
  date: string;
  description: string;
  amount: string;
  status: "paid" | "open" | "refunded";
  pdfUrl?: string;
};

/** Sample rows for UI preview; replace with API data after Stripe. */
const MOCK_INVOICES: InvoiceRow[] = [
  {
    id: "inv_001",
    date: "Mar 1, 2025",
    description: "Pro — monthly",
    amount: "$5.00",
    status: "paid",
  },
  {
    id: "inv_002",
    date: "Feb 1, 2025",
    description: "Pro — monthly",
    amount: "$5.00",
    status: "paid",
  },
  {
    id: "inv_003",
    date: "Jan 15, 2025",
    description: "Credit — partial refund",
    amount: "−$2.00",
    status: "refunded",
  },
];

function statusBadge(status: InvoiceRow["status"]) {
  switch (status) {
    case "paid":
      return (
        <Badge variant="secondary" className="font-normal">
          Paid
        </Badge>
      );
    case "open":
      return (
        <Badge variant="outline" className="font-normal text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-900">
          Open
        </Badge>
      );
    case "refunded":
      return (
        <Badge variant="outline" className="font-normal">
          Refunded
        </Badge>
      );
    default:
      return null;
  }
}

interface SettingsBillingSectionProps {
  userEmail: string;
}

export function SettingsBillingSection({ userEmail }: SettingsBillingSectionProps) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const isPro = MOCK_PLAN === "pro";
  const usagePct =
    MOCK_USAGE.limit > 0 ? Math.min(100, Math.round((MOCK_USAGE.used / MOCK_USAGE.limit) * 100)) : 0;

  const onStripePlaceholder = (action: string) => {
    toast.info(`${action} will be available once billing is connected.`);
  };

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Billing</h2>
        <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
          Pro is <span className="text-foreground font-medium">${PRO_PRICE_USD_MONTHLY}/month</span> and includes
          unlimited AI chat on title details and the dashboard, plus other advanced features as we ship them.
          Payment processing is wired up last; actions below preview the full experience.
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
          {/* Set to true when subscription status is `past_due` (after Stripe). */}
          {false && (
            <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
              <AlertTriangle className="size-4" />
              <AlertTitle>Payment failed</AlertTitle>
              <AlertDescription>
                We couldn&apos;t charge your default card. Update your payment method to avoid losing Pro access.
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
                    <Badge className="shrink-0 font-medium">Pro</Badge>
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
                    {isPro
                      ? "Renews on Apr 1, 2025 · billed monthly"
                      : `Upgrade for $${PRO_PRICE_USD_MONTHLY}/mo — AI chat and more`}
                  </p>
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
                        {isPro ? "unlimited" : "limited each billing period on Free"}
                      </span>
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
                  <>
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto cursor-pointer"
                      onClick={() => onStripePlaceholder("Plan comparison")}
                    >
                      Compare plans
                    </Button>
                    <Button
                      className="w-full sm:w-auto cursor-pointer gap-2 bg-[#006DCA] hover:bg-[#0056A3] text-white"
                      onClick={() => onStripePlaceholder("Checkout")}
                    >
                      <Sparkles className="size-4" />
                      Upgrade to Pro
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full sm:ml-auto sm:w-auto cursor-pointer"
                    onClick={() => onStripePlaceholder("Customer portal")}
                  >
                    Manage subscription
                  </Button>
                )}
              </CardFooter>
            </Card>

            <Card className="shadow-none gap-0 py-0 overflow-hidden">
              <CardHeader className="border-b bg-muted/30 px-5 py-4 space-y-1">
                <CardTitle className="text-base font-semibold">Usage</CardTitle>
                <CardDescription className="text-xs">
                  AI chat limits reset each billing period on Free; Pro is unlimited for eligible surfaces.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-5 py-5 space-y-4">
                <div>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium">{"AI chat (details & dashboard)"}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {MOCK_USAGE.used} of {MOCK_USAGE.limit} used
                    </span>
                  </div>
                  <Progress value={usagePct} className="mt-3 h-2" />
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    {`Free includes a capped number of AI messages per period across Ask Us and dashboard chat. Pro ($${PRO_PRICE_USD_MONTHLY}/mo) removes that cap. Values shown are illustrative until billing is live.`}
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
              <CardDescription className="text-xs">Default card for subscriptions and one-off charges</CardDescription>
            </CardHeader>
            <CardContent className="px-5 py-5">
              {isPro ? (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-14 items-center justify-center rounded-md border bg-background text-xs font-semibold tracking-wide">
                      VISA
                    </div>
                    <div>
                      <p className="text-sm font-medium">Visa ending in 4242</p>
                      <p className="text-xs text-muted-foreground">Expires 12/2027 · Default</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="cursor-pointer shrink-0" onClick={() => onStripePlaceholder("Update card")}>
                    Update
                  </Button>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-center">
                  <p className="text-sm font-medium text-foreground">No card on file</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                    A payment method is saved when you subscribe. You won&apos;t be charged on the Free plan.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-4 cursor-pointer"
                    onClick={() => onStripePlaceholder("Add payment method")}
                  >
                    Add payment method
                  </Button>
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
              isPro ? "border-destructive/25 bg-destructive/[0.03]" : "border-border bg-muted/20"
            )}
          >
            <h3 className="text-sm font-semibold text-foreground">Danger zone</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
              {isPro
                ? "Canceling stops future renewals. Access continues until the end of the current period unless otherwise stated."
                : "You don’t have an active paid subscription. There’s nothing to cancel."}
            </p>
            <div className="mt-4">
              {isPro ? (
                <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="cursor-pointer border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive">
                      Cancel subscription
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
                      <AlertDialogDescription className="text-left leading-relaxed">
                        You&apos;ll keep Pro access until the end of your current billing period. This action can&apos;t be
                        completed here until billing is connected — the button below confirms the intended flow only.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="cursor-pointer">Keep Pro</AlertDialogCancel>
                      <AlertDialogAction
                        className="cursor-pointer bg-destructive text-white hover:bg-destructive/90"
                        onClick={() => {
                          onStripePlaceholder("Cancel at period end");
                        }}
                      >
                        Confirm cancellation
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <Button variant="outline" size="sm" disabled className="opacity-60">
                  Cancel subscription
                </Button>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="invoices" className="mt-0 space-y-4 outline-none">
          <Card className="shadow-none py-0 gap-0 overflow-hidden">
            <CardHeader className="border-b bg-muted/30 px-5 py-4 space-y-1">
              <CardTitle className="text-base font-semibold">Invoice history</CardTitle>
              <CardDescription className="text-xs">
                Download PDFs for your records or print from the browser. Sample rows below show the layout.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 py-0">
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
                  {MOCK_INVOICES.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="px-4 py-3 text-sm text-muted-foreground tabular-nums">{inv.date}</TableCell>
                      <TableCell className="px-4 py-3 text-sm font-medium">{inv.description}</TableCell>
                      <TableCell className="px-4 py-3 text-sm text-right tabular-nums">{inv.amount}</TableCell>
                      <TableCell className="px-4 py-3">{statusBadge(inv.status)}</TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 cursor-pointer"
                            title="Download PDF"
                            onClick={() => onStripePlaceholder("Invoice PDF")}
                          >
                            <Download className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 cursor-pointer"
                            title="Print"
                            onClick={() => onStripePlaceholder("Print invoice")}
                          >
                            <Printer className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="border-t bg-muted/10 px-5 py-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Invoice numbers, tax lines, and PDF links will populate automatically after Stripe Billing is connected.
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
              <CardDescription className="text-xs">What you can generate from this page later</CardDescription>
            </CardHeader>
            <CardContent className="px-5 py-5 space-y-3 text-sm text-muted-foreground leading-relaxed">
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <span className="text-foreground font-medium">Invoices</span> — PDF downloads for each charge (official
                  record for taxes and expenses).
                </li>
                <li>
                  <span className="text-foreground font-medium">Receipts</span> — usually the same PDF as the invoice for
                  card payments.
                </li>
                <li>
                  <span className="text-foreground font-medium">Policies</span> — open Terms or Privacy, then use your
                  browser&apos;s print dialog (Ctrl+P / ⌘P) to save or print.
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
                <a href="mailto:support@what2watch.com?subject=Billing%20question">Email support@what2watch.com</a>
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
