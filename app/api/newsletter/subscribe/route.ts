"use server";

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const mailchimpApiKey = process.env.MAILCHIMP_API_KEY;
const mailchimpServerPrefix = process.env.MAILCHIMP_SERVER_PREFIX;
const audienceId = process.env.AUDIENCE_ID;

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  try {
    if (!mailchimpApiKey || !mailchimpServerPrefix || !audienceId) {
      return NextResponse.json(
        { error: "Newsletter service is not configured." },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    const subscriberHash = crypto.createHash("md5").update(email).digest("hex");
    const url = `https://${mailchimpServerPrefix}.api.mailchimp.com/3.0/lists/${audienceId}/members/${subscriberHash}`;
    const auth = Buffer.from(`anystring:${mailchimpApiKey}`).toString("base64");

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        email_address: email,
        status_if_new: "subscribed",
        status: "subscribed",
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      const detail =
        typeof result?.detail === "string"
          ? result.detail
          : "Failed to subscribe. Please try again.";
      return NextResponse.json({ error: detail }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      message: "You have been subscribed to the newsletter.",
    });
  } catch (error) {
    console.error("[Newsletter subscribe] POST error", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

