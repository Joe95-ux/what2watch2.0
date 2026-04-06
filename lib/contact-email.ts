import nodemailer from "nodemailer";

type ContactType = "support" | "feedback" | "general";

interface ContactEmailPayload {
  type: ContactType;
  reason: string;
  priority?: string;
  message: string;
  userEmail: string | null;
  username?: string | null;
  displayName?: string | null;
}

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT || 465);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const contactFromEmail = process.env.CONTACT_FROM_EMAIL;
const contactToEmail = process.env.CONTACT_TO_EMAIL;

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!smtpHost || !smtpUser || !smtpPass) return null;

  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465 || smtpPort === 2465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  return transporter;
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getTypeLabel(type: ContactType) {
  if (type === "support") return "Support";
  if (type === "feedback") return "Feedback";
  return "General Enquiry";
}

export async function sendContactSubmissionEmail(
  payload: ContactEmailPayload
): Promise<boolean> {
  if (!contactFromEmail || !contactToEmail) return false;

  const transport = getTransporter();
  if (!transport) return false;

  const displayName =
    payload.displayName?.trim() || payload.username?.trim() || "Unknown user";
  const senderEmail = payload.userEmail?.trim() || "No email provided";
  const typeLabel = getTypeLabel(payload.type);
  const subject = `[${typeLabel}] ${payload.reason}`;

  const text = [
    `Type: ${typeLabel}`,
    `Reason: ${payload.reason}`,
    `Priority: ${payload.priority || "Medium"}`,
    `From user: ${displayName}`,
    `User email: ${senderEmail}`,
    "",
    "Message:",
    payload.message,
  ].join("\n");

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://what2watch2-0.vercel.app";
  const logoUrl = `${baseUrl.replace(/\/$/, "")}/what2watch-logo.png`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; background-color: #0b1020; padding: 24px;">
      <div style="max-width: 640px; margin: 0 auto; background-color: #0f172a; border: 1px solid #1f2937; border-radius: 12px; padding: 24px;">
        <div style="text-align: center; margin-bottom: 16px;">
          <a href="${baseUrl}" style="display: inline-block; text-decoration: none;">
            <img src="${logoUrl}" alt="What2Watch logo" width="40" height="40" style="display: block; border-radius: 8px;" />
          </a>
        </div>
        <h2 style="margin: 0 0 14px; color: #f8fafc;">New ${escapeHtml(typeLabel)} Submission</h2>
        <p style="margin: 8px 0; color: #e5e7eb;"><strong>Type:</strong> ${escapeHtml(typeLabel)}</p>
        <p style="margin: 8px 0; color: #e5e7eb;"><strong>Reason:</strong> ${escapeHtml(payload.reason)}</p>
        <p style="margin: 8px 0; color: #e5e7eb;"><strong>Priority:</strong> ${escapeHtml(payload.priority || "Medium")}</p>
        <p style="margin: 8px 0; color: #e5e7eb;"><strong>From user:</strong> ${escapeHtml(displayName)}</p>
        <p style="margin: 8px 0; color: #e5e7eb;"><strong>User email:</strong> ${escapeHtml(senderEmail)}</p>
        <hr style="margin: 16px 0; border: 0; border-top: 1px solid #1f2937;" />
        <p style="margin: 0 0 8px; color: #f8fafc;"><strong>Message:</strong></p>
        <pre style="white-space: pre-wrap; font-family: inherit; margin: 0; color: #9ca3af; background-color: #111827; border-radius: 8px; padding: 12px;">${escapeHtml(
        payload.message
      )}</pre>
      </div>
    </div>
  `;

  try {
    await transport.sendMail({
      from: contactFromEmail,
      to: contactToEmail,
      replyTo: payload.userEmail || undefined,
      subject,
      text,
      html,
    });
    return true;
  } catch (error) {
    console.error("[ContactEmail] SMTP send error", error);
    return false;
  }
}

