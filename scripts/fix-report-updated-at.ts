/**
 * Data migration script to fix null updatedAt values in ForumPostReport and ForumReplyReport
 * 
 * This script updates all records with null updatedAt to use:
 * - reviewedAt if available
 * - createdAt as fallback
 * 
 * Run with: npx tsx scripts/fix-report-updated-at.ts
 */

import { db } from "../lib/db";

async function fixUpdatedAt() {
  try {
    console.log("Starting updatedAt migration for forum reports...");

    // Fix ForumPostReport records
    console.log("\n1. Fixing ForumPostReport records...");
    const postReports = await db.forumPostReport.findMany({
      select: {
        id: true,
        createdAt: true,
        reviewedAt: true,
      },
    });

    let postReportsFixed = 0;
    let postReportsSkipped = 0;
    let postReportsErrors = 0;

    for (const report of postReports) {
      try {
        // Use reviewedAt if available, otherwise createdAt
        const updatedAtValue = report.reviewedAt || report.createdAt;
        
        await db.forumPostReport.update({
          where: { id: report.id },
          data: {
            updatedAt: updatedAtValue,
          },
        });

        postReportsFixed++;
        if (postReportsFixed % 10 === 0) {
          console.log(`  Processed ${postReportsFixed} post reports...`);
        }
      } catch (error: any) {
        console.error(`  ✗ Error fixing post report ${report.id}:`, error.message);
        postReportsErrors++;
      }
    }

    console.log(`  ✓ Fixed: ${postReportsFixed}, Skipped: ${postReportsSkipped}, Errors: ${postReportsErrors}`);

    // Fix ForumReplyReport records
    console.log("\n2. Fixing ForumReplyReport records...");
    const replyReports = await db.forumReplyReport.findMany({
      select: {
        id: true,
        createdAt: true,
        reviewedAt: true,
      },
    });

    let replyReportsFixed = 0;
    let replyReportsSkipped = 0;
    let replyReportsErrors = 0;

    for (const report of replyReports) {
      try {
        // Use reviewedAt if available, otherwise createdAt
        const updatedAtValue = report.reviewedAt || report.createdAt;
        
        await db.forumReplyReport.update({
          where: { id: report.id },
          data: {
            updatedAt: updatedAtValue,
          },
        });

        replyReportsFixed++;
        if (replyReportsFixed % 10 === 0) {
          console.log(`  Processed ${replyReportsFixed} reply reports...`);
        }
      } catch (error: any) {
        console.error(`  ✗ Error fixing reply report ${report.id}:`, error.message);
        replyReportsErrors++;
      }
    }

    console.log(`  ✓ Fixed: ${replyReportsFixed}, Skipped: ${replyReportsSkipped}, Errors: ${replyReportsErrors}`);

    console.log("\n✅ Migration complete!");
    console.log(`\nSummary:`);
    console.log(`  Post Reports: ${postReportsFixed} fixed, ${postReportsErrors} errors`);
    console.log(`  Reply Reports: ${replyReportsFixed} fixed, ${replyReportsErrors} errors`);
    console.log(`\n⚠️  Note: After running this script, you can revert the workarounds in the API routes.`);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

fixUpdatedAt();

