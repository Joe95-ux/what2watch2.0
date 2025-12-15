// Dynamic import to avoid issues if resend is not installed
let Resend: any;
try {
  Resend = require("resend").Resend;
  console.log("[Email] Resend module loaded successfully");
} catch (e) {
  console.error("[Email] Failed to load Resend module:", e);
  // Resend not installed, will handle gracefully
}

const resendApiKey = process.env.RESEND_API_KEY;
const resendDomain = process.env.RESEND_DOMAIN;

// Debug logging for configuration
console.log("[Email] Configuration check:", {
  resendModuleLoaded: !!Resend,
  apiKeyConfigured: !!resendApiKey,
  apiKeyLength: resendApiKey?.length || 0,
  domainConfigured: !!resendDomain,
  domain: resendDomain || "default (onboarding.resend.dev)",
});

// Initialize Resend client
const resend = resendApiKey && Resend ? new Resend(resendApiKey) : null;

if (!resend) {
  console.warn("[Email] Resend client not initialized. Check RESEND_API_KEY environment variable.");
}

// Get the from email address
function getFromEmail() {
  if (resendDomain) {
    const fromEmail = `noreply@${resendDomain}`;
    console.log("[Email] Using custom domain:", fromEmail);
    return fromEmail;
  }
  // Use Resend's default domain (onboarding.resend.dev)
  const defaultEmail = "onboarding@resend.dev";
  console.log("[Email] Using default domain:", defaultEmail);
  return defaultEmail;
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
  
  console.log("[Email] === Starting email send ===");
  console.log("[Email] To:", to);
  console.log("[Email] From:", fromEmail);
  console.log("[Email] Subject:", subject);
  console.log("[Email] HTML length:", html.length, "characters");
  
  if (!resend) {
    console.error("[Email] Resend client not initialized. Cannot send email.");
    console.error("[Email] Check RESEND_API_KEY environment variable.");
    return false;
  }

  if (!to || !to.trim()) {
    console.error("[Email] Invalid recipient email address:", to);
    return false;
  }

  if (!subject || !subject.trim()) {
    console.error("[Email] Invalid subject:", subject);
    return false;
  }

  if (!html || !html.trim()) {
    console.error("[Email] Invalid HTML content (empty or missing)");
    return false;
  }

  try {
    console.log("[Email] Calling Resend API...");
    const emailPayload = {
      from: fromEmail,
      to,
      subject,
      html,
    };
    
    console.log("[Email] Payload:", {
      from: emailPayload.from,
      to: emailPayload.to,
      subject: emailPayload.subject,
      htmlLength: emailPayload.html.length,
    });

    const result = await resend.emails.send(emailPayload);

    console.log("[Email] Resend API response received");
    console.log("[Email] Response data:", JSON.stringify(result, null, 2));

    if (result.error) {
      console.error("[Email] Resend API returned an error:");
      console.error("[Email] Error type:", result.error?.constructor?.name);
      console.error("[Email] Error message:", result.error?.message);
      console.error("[Email] Error details:", JSON.stringify(result.error, null, 2));
      return false;
    }

    if (result.data?.id) {
      console.log("[Email] ✓ Email sent successfully!");
      console.log("[Email] Email ID:", result.data.id);
      console.log("[Email] === Email send completed ===");
      return true;
    } else {
      console.warn("[Email] Resend API response missing email ID");
      console.warn("[Email] Full response:", JSON.stringify(result, null, 2));
      return false;
    }
  } catch (error: any) {
    console.error("[Email] ✗ Exception occurred while sending email:");
    console.error("[Email] Error type:", error?.constructor?.name);
    console.error("[Email] Error message:", error?.message);
    console.error("[Email] Error stack:", error?.stack);
    console.error("[Email] Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    console.error("[Email] === Email send failed ===");
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
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; border-bottom: 1px solid #e5e5e5;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1a1a1a;">${title}</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 30px 40px;">
              <div style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                ${content}
              </div>
            </td>
          </tr>
          
          ${ctaText && ctaUrl ? `
          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 40px 30px; text-align: center;">
              <a href="${ctaUrl}" style="display: inline-block; padding: 12px 24px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px;">${ctaText}</a>
            </td>
          </tr>
          ` : ""}
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid #e5e5e5; text-align: center;">
              <p style="margin: 0; color: #8a8a8a; font-size: 14px;">
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

