import { getEmailTemplate } from "./email";

/**
 * Email template for when content is reported
 */
export function getContentReportedEmail({
  contentOwnerName,
  contentType,
  contentTitle,
  contentPreview,
  reportReason,
  viewContentUrl,
  appealUrl,
}: {
  contentOwnerName: string;
  contentType: "post" | "reply";
  contentTitle?: string;
  contentPreview: string;
  reportReason: string;
  viewContentUrl: string;
  appealUrl: string;
}): string {
  const contentLabel = contentType === "post" ? "post" : "reply";
  const title = contentTitle || "Your Content";

  const content = `
    <p style="margin: 0 0 20px;">Hi ${contentOwnerName},</p>
    
    <p style="margin: 0 0 20px;">
      Your ${contentLabel} has been reported by a community member. We're reviewing the report and will take appropriate action if necessary.
    </p>
    
    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0 0 10px; font-weight: 600; color: #1a1a1a;">Reported ${contentLabel === "post" ? "Post" : "Reply"}:</p>
      ${contentTitle ? `<p style="margin: 0 0 10px; font-weight: 500; color: #4a4a4a;">${title}</p>` : ""}
      <p style="margin: 0 0 15px; color: #6a6a6a; font-size: 14px; line-height: 1.5;">${contentPreview}</p>
      
      <p style="margin: 15px 0 0; font-weight: 600; color: #1a1a1a;">Report Reason:</p>
      <p style="margin: 5px 0 0; color: #6a6a6a; font-size: 14px;">${reportReason}</p>
    </div>
    
    <p style="margin: 20px 0;">
      If you believe this report is incorrect, you can appeal the decision once it's been reviewed.
    </p>
  `;

  return getEmailTemplate({
    title: "Your Content Has Been Reported",
    content,
    ctaText: "View Content",
    ctaUrl: viewContentUrl,
    footerText: "You'll be notified when the report has been reviewed.",
  });
}

/**
 * Email template for when a report is reviewed
 */
export function getReportReviewedEmail({
  contentOwnerName,
  contentType,
  contentTitle,
  action,
  reviewNotes,
  viewContentUrl,
  appealUrl,
}: {
  contentOwnerName: string;
  contentType: "post" | "reply";
  contentTitle?: string;
  action: "approved" | "rejected";
  reviewNotes?: string;
  viewContentUrl: string;
  appealUrl: string;
}): string {
  const contentLabel = contentType === "post" ? "post" : "reply";
  const title = contentTitle || "Your Content";
  const isApproved = action === "approved";

  const content = `
    <p style="margin: 0 0 20px;">Hi ${contentOwnerName},</p>
    
    <p style="margin: 0 0 20px;">
      The report on your ${contentLabel} has been reviewed by our moderation team.
    </p>
    
    <div style="background-color: ${isApproved ? "#fee2e2" : "#dcfce7"}; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid ${isApproved ? "#dc2626" : "#16a34a"};">
      <p style="margin: 0 0 10px; font-weight: 600; color: #1a1a1a;">
        ${isApproved ? "⚠️ Action Taken" : "✓ Report Dismissed"}
      </p>
      <p style="margin: 0; color: #4a4a4a;">
        ${isApproved 
          ? `Your ${contentLabel} has been hidden due to a violation of our community guidelines.` 
          : `The report on your ${contentLabel} has been dismissed. Your content remains visible.`}
      </p>
    </div>
    
    ${reviewNotes ? `
    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0 0 8px; font-weight: 600; color: #1a1a1a; font-size: 14px;">Review Notes:</p>
      <p style="margin: 0; color: #6a6a6a; font-size: 14px; line-height: 1.5;">${reviewNotes}</p>
    </div>
    ` : ""}
    
    ${isApproved ? `
    <p style="margin: 20px 0;">
      If you believe this decision is incorrect, you can appeal within 30 days.
    </p>
    ` : `
    <p style="margin: 20px 0;">
      Thank you for being part of our community!
    </p>
    `}
  `;

  return getEmailTemplate({
    title: isApproved ? "Report Review - Action Taken" : "Report Review - Dismissed",
    content,
    ctaText: isApproved ? "Appeal Decision" : "View Content",
    ctaUrl: isApproved ? appealUrl : viewContentUrl,
    footerText: isApproved 
      ? "You have 30 days to appeal this decision." 
      : "If you have any questions, please contact our support team.",
  });
}

/**
 * Email template for when an appeal is submitted
 */
export function getAppealSubmittedEmail({
  contentOwnerName,
  contentType,
  contentTitle,
  appealUrl,
}: {
  contentOwnerName: string;
  contentType: "post" | "reply";
  contentTitle?: string;
  appealUrl: string;
}): string {
  const contentLabel = contentType === "post" ? "post" : "reply";

  const content = `
    <p style="margin: 0 0 20px;">Hi ${contentOwnerName},</p>
    
    <p style="margin: 0 0 20px;">
      We've received your appeal for your ${contentLabel}. Our moderation team will review it and get back to you within 2-3 business days.
    </p>
    
    <div style="background-color: #f0f9ff; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #0284c7;">
      <p style="margin: 0; color: #4a4a4a;">
        <strong>What happens next?</strong><br>
        Our team will carefully review your appeal and the original report. You'll receive an email notification once a decision has been made.
      </p>
    </div>
    
    <p style="margin: 20px 0;">
      You can check the status of your appeal at any time.
    </p>
  `;

  return getEmailTemplate({
    title: "Appeal Submitted",
    content,
    ctaText: "View Appeal Status",
    ctaUrl: appealUrl,
    footerText: "We typically respond to appeals within 2-3 business days.",
  });
}

/**
 * Email template for when an appeal is reviewed
 */
export function getAppealReviewedEmail({
  contentOwnerName,
  contentType,
  contentTitle,
  decision,
  reviewNotes,
  viewContentUrl,
}: {
  contentOwnerName: string;
  contentType: "post" | "reply";
  contentTitle?: string;
  decision: "approved" | "rejected";
  reviewNotes?: string;
  viewContentUrl: string;
}): string {
  const contentLabel = contentType === "post" ? "post" : "reply";
  const isApproved = decision === "approved";

  const content = `
    <p style="margin: 0 0 20px;">Hi ${contentOwnerName},</p>
    
    <p style="margin: 0 0 20px;">
      Your appeal has been reviewed by our moderation team.
    </p>
    
    <div style="background-color: ${isApproved ? "#dcfce7" : "#fee2e2"}; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid ${isApproved ? "#16a34a" : "#dc2626"};">
      <p style="margin: 0 0 10px; font-weight: 600; color: #1a1a1a;">
        ${isApproved ? "✓ Appeal Approved" : "✗ Appeal Rejected"}
      </p>
      <p style="margin: 0; color: #4a4a4a;">
        ${isApproved 
          ? `Your appeal has been approved! Your ${contentLabel} has been restored and is now visible again.` 
          : `After careful review, we've determined that the original moderation action was correct. Your ${contentLabel} will remain hidden.`}
      </p>
    </div>
    
    ${reviewNotes ? `
    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0 0 8px; font-weight: 600; color: #1a1a1a; font-size: 14px;">Review Notes:</p>
      <p style="margin: 0; color: #6a6a6a; font-size: 14px; line-height: 1.5;">${reviewNotes}</p>
    </div>
    ` : ""}
    
    ${isApproved ? `
    <p style="margin: 20px 0;">
      Thank you for your patience. We're glad we could resolve this issue!
    </p>
    ` : `
    <p style="margin: 20px 0;">
      If you have further questions or concerns, please contact our support team.
    </p>
    `}
  `;

  return getEmailTemplate({
    title: isApproved ? "Appeal Approved" : "Appeal Rejected",
    content,
    ctaText: "View Content",
    ctaUrl: viewContentUrl,
  });
}

/**
 * Email template for forum reply notifications
 */
export function getForumReplyEmail({
  recipientName,
  actorName,
  postTitle,
  replyPreview,
  viewPostUrl,
  notificationSettingsUrl,
}: {
  recipientName: string;
  actorName: string;
  postTitle: string;
  replyPreview: string;
  viewPostUrl: string;
  notificationSettingsUrl: string;
}): string {
  const content = `
    <p style="margin: 0 0 20px;">Hi ${recipientName},</p>
    
    <p style="margin: 0 0 20px;">
      <strong>${actorName}</strong> replied to your post "${postTitle}".
    </p>
    
    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0 0 10px; font-weight: 600; color: #1a1a1a;">Reply:</p>
      <p style="margin: 0; color: #6a6a6a; font-size: 14px; line-height: 1.5;">${replyPreview}</p>
    </div>
    
    <p style="margin: 20px 0;">
      You can reply to this comment or view the full discussion on the post.
    </p>
  `;

  return getEmailTemplate({
    title: "New Reply to Your Post",
    content,
    ctaText: "View Post",
    ctaUrl: viewPostUrl,
    footerText: `You're receiving this because someone replied to your post. <a href="${notificationSettingsUrl}" style="color: #6b7280; text-decoration: underline;">Manage notification preferences</a>`,
  });
}

/**
 * Email template for forum mention notifications
 */
export function getForumMentionEmail({
  recipientName,
  actorName,
  contentType,
  contentTitle,
  contentPreview,
  viewContentUrl,
  notificationSettingsUrl,
}: {
  recipientName: string;
  actorName: string;
  contentType: "post" | "reply";
  contentTitle: string;
  contentPreview: string;
  viewContentUrl: string;
  notificationSettingsUrl: string;
}): string {
  const contentLabel = contentType === "post" ? "post" : "comment";

  const content = `
    <p style="margin: 0 0 20px;">Hi ${recipientName},</p>
    
    <p style="margin: 0 0 20px;">
      <strong>${actorName}</strong> mentioned you in a ${contentLabel} on "${contentTitle}".
    </p>
    
    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0 0 10px; font-weight: 600; color: #1a1a1a;">${contentLabel === "post" ? "Post" : "Comment"}:</p>
      <p style="margin: 0; color: #6a6a6a; font-size: 14px; line-height: 1.5;">${contentPreview}</p>
    </div>
    
    <p style="margin: 20px 0;">
      Click below to view the ${contentLabel} and join the conversation.
    </p>
  `;

  return getEmailTemplate({
    title: "You Were Mentioned",
    content,
    ctaText: `View ${contentLabel === "post" ? "Post" : "Comment"}`,
    ctaUrl: viewContentUrl,
    footerText: `You're receiving this because you were mentioned. <a href="${notificationSettingsUrl}" style="color: #6b7280; text-decoration: underline;">Manage notification preferences</a>`,
  });
}

/**
 * Email template for forum subscription notifications
 */
export function getForumSubscriptionEmail({
  recipientName,
  actorName,
  postTitle,
  replyPreview,
  viewPostUrl,
  notificationSettingsUrl,
}: {
  recipientName: string;
  actorName: string;
  postTitle: string;
  replyPreview: string;
  viewPostUrl: string;
  notificationSettingsUrl: string;
}): string {
  const content = `
    <p style="margin: 0 0 20px;">Hi ${recipientName},</p>
    
    <p style="margin: 0 0 20px;">
      <strong>${actorName}</strong> replied to a post you're following: "${postTitle}".
    </p>
    
    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0 0 10px; font-weight: 600; color: #1a1a1a;">Reply:</p>
      <p style="margin: 0; color: #6a6a6a; font-size: 14px; line-height: 1.5;">${replyPreview}</p>
    </div>
    
    <p style="margin: 20px 0;">
      Click below to view the reply and continue the discussion.
    </p>
  `;

  return getEmailTemplate({
    title: "New Reply to Followed Post",
    content,
    ctaText: "View Post",
    ctaUrl: viewPostUrl,
    footerText: `You're receiving this because you're following this post. <a href="${notificationSettingsUrl}" style="color: #6b7280; text-decoration: underline;">Manage notification preferences</a>`,
  });
}

/**
 * Email template for admins when an appeal is submitted
 */
export function getAdminAppealNotificationEmail({
  contentType,
  contentTitle,
  contentPreview,
  appealReason,
  reviewUrl,
}: {
  contentType: "post" | "reply";
  contentTitle?: string;
  contentPreview: string;
  appealReason: string;
  reviewUrl: string;
}): string {
  const contentLabel = contentType === "post" ? "post" : "reply";

  const content = `
    <p style="margin: 0 0 20px;">A new appeal has been submitted and requires your review.</p>
    
    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0 0 10px; font-weight: 600; color: #1a1a1a;">Appealed ${contentLabel === "post" ? "Post" : "Reply"}:</p>
      ${contentTitle ? `<p style="margin: 0 0 10px; font-weight: 500; color: #4a4a4a;">${contentTitle}</p>` : ""}
      <p style="margin: 0 0 15px; color: #6a6a6a; font-size: 14px; line-height: 1.5;">${contentPreview}</p>
      
      <p style="margin: 15px 0 0; font-weight: 600; color: #1a1a1a;">Appeal Reason:</p>
      <p style="margin: 5px 0 0; color: #6a6a6a; font-size: 14px; line-height: 1.5;">${appealReason}</p>
    </div>
    
    <p style="margin: 20px 0;">
      Please review this appeal and make a decision within 2-3 business days.
    </p>
  `;

  return getEmailTemplate({
    title: "New Appeal Requires Review",
    content,
    ctaText: "Review Appeal",
    ctaUrl: reviewUrl,
    footerText: "This appeal is pending your review.",
  });
}

