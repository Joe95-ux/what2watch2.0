import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getAppBaseUrl, getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No billing account yet. Subscribe to Pro first." },
        { status: 400 },
      );
    }

    const stripe = getStripe();
    const baseUrl = getAppBaseUrl();

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${baseUrl}/settings?section=billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("[Stripe portal]", e);
    const message = e instanceof Error ? e.message : "Portal session failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
