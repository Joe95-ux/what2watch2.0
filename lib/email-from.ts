/**
 * Shared "From" resolution for Resend-aligned sending (API + SMTP contact).
 * Prefer RESEND_FROM_EMAIL; else build from RESEND_DOMAIN (avoid noreply@).
 */
export function getResendConfiguredFromEmail(): string | null {
  const resendFromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  if (resendFromEmail) return resendFromEmail;

  const resendDomain = process.env.RESEND_DOMAIN?.trim();
  if (!resendDomain) return null;

  return resendDomain.includes("@")
    ? resendDomain
    : `hello@${resendDomain}`;
}
