import { getResendConfiguredFromEmail } from "./email-from";

// Dynamic import to avoid issues if resend is not installed
let Resend: any;
try {
  Resend = require("resend").Resend;
} catch (e) {
  // Resend not installed, will handle gracefully
}

const resendApiKey = process.env.RESEND_API_KEY;

// Initialize Resend client
const resend = resendApiKey && Resend ? new Resend(resendApiKey) : null;

// Get the from email address
function getFromEmail() {
  const configured = getResendConfiguredFromEmail();
  if (configured) return configured;
  // Use Resend's default domain (onboarding.resend.dev)
  return "onboarding@resend.dev";
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

/**
 * Send an email using Resend
 */
export async function sendEmail({ to, subject, html, from }: SendEmailOptions): Promise<boolean> {
  const fromEmail = from || getFromEmail();
  
  if (!resend) {
    return false;
  }

  if (!to || !to.trim()) {
    return false;
  }

  if (!subject || !subject.trim()) {
    return false;
  }

  if (!html || !html.trim()) {
    return false;
  }

  try {
    const emailPayload = {
      from: fromEmail,
      to,
      subject,
      html,
    };

    const result = await resend.emails.send(emailPayload);

    if (result.error) {
      return false;
    }

    if (result.data?.id) {
      return true;
    } else {
      return false;
    }
  } catch (error: any) {
    return false;
  }
}

/**
 * Base email template wrapper
 */
export function getEmailTemplate({
  title,
  content,
  ctaText,
  ctaUrl,
  footerText,
}: {
  title: string;
  content: string;
  ctaText?: string;
  ctaUrl?: string;
  footerText?: string;
}): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://what2watch2-0.vercel.app";
  const logoUrl = `${baseUrl.replace(/\/$/, "")}/what2watch-logo.png`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0b1020;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #0b1020;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #0f172a; border-radius: 12px; border: 1px solid #1f2937; box-shadow: 0 10px 25px rgba(0,0,0,0.35);">
          <!-- Brand -->
          <tr>
            <td style="padding: 28px 40px 12px; text-align: center;">
              <a href="${baseUrl}" style="display: inline-block; text-decoration: none;">
                <img src="${logoUrl}" alt="What2Watch logo" width="160" style="display: block; width: 160px; max-width: 100%; height: auto;" />
              </a>
            </td>
          </tr>
          <!-- Header -->
          <tr>
            <td style="padding: 12px 40px 24px; text-align: center; border-bottom: 1px solid #1f2937;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #f8fafc;">${title}</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 30px 40px;">
              <div style="color: #e5e7eb; font-size: 16px; line-height: 1.6;">
                ${content}
              </div>
            </td>
          </tr>
          
          ${ctaText && ctaUrl ? `
          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 40px 30px; text-align: center;">
              <a href="${ctaUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">${ctaText}</a>
            </td>
          </tr>
          ` : ""}
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px 30px; border-top: 1px solid #1f2937; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 14px;">
                ${footerText || "This is an automated message. Please do not reply to this email."}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

