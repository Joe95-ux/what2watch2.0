// Dynamic import to avoid issues if resend is not installed
let Resend: any;
try {
  Resend = require("resend").Resend;
} catch (e) {
  // Resend not installed, will handle gracefully
}

const resendApiKey = process.env.RESEND_API_KEY;
const resendDomain = process.env.RESEND_DOMAIN;

// Initialize Resend client
const resend = resendApiKey && Resend ? new Resend(resendApiKey) : null;

// Get the from email address
function getFromEmail() {
  if (resendDomain) {
    // If RESEND_DOMAIN contains @, use it directly as full email
    // Otherwise, prepend noreply@
    const fromEmail = resendDomain.includes("@") 
      ? resendDomain 
      : `noreply@${resendDomain}`;
    return fromEmail;
  }
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

