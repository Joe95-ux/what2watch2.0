/**
 * Script to make a user an admin
 * 
 * Usage:
 *   npx tsx scripts/make-admin.ts <clerkId> [role]
 * 
 * Examples:
 *   npx tsx scripts/make-admin.ts user_2abc123
 *   npx tsx scripts/make-admin.ts user_2abc123 ADMIN
 *   npx tsx scripts/make-admin.ts user_2abc123 SUPER_ADMIN
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function makeAdmin(clerkId: string, role: "ADMIN" | "SUPER_ADMIN" = "ADMIN") {
  try {
    // Find user by Clerk ID
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true, username: true, displayName: true, role: true, isForumAdmin: true },
    });

    if (!user) {
      console.error(`❌ User with Clerk ID "${clerkId}" not found.`);
      console.log("\n💡 Make sure the user has signed in at least once to create their account.");
      process.exit(1);
    }

    // Update user to admin
    await prisma.user.update({
      where: { clerkId },
      data: {
        role: role,
        isForumAdmin: true,
        isForumModerator: true, // Admins are also moderators
      },
    });

    console.log(`✅ Successfully made user admin!`);
    console.log(`   Username: ${user.username || "N/A"}`);
    console.log(`   Display Name: ${user.displayName || "N/A"}`);
    console.log(`   Role: ${role}`);
    console.log(`   Forum Admin: true`);
    console.log(`   Forum Moderator: true`);
  } catch (error) {
    console.error("❌ Error making user admin:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log("Usage: npx tsx scripts/make-admin.ts <clerkId> [role]");
  console.log("\nExamples:");
  console.log("  npx tsx scripts/make-admin.ts user_2abc123");
  console.log("  npx tsx scripts/make-admin.ts user_2abc123 ADMIN");
  console.log("  npx tsx scripts/make-admin.ts user_2abc123 SUPER_ADMIN");
  process.exit(1);
}

const clerkId = args[0];
const role = (args[1] as "ADMIN" | "SUPER_ADMIN") || "ADMIN";

if (!clerkId.startsWith("user_")) {
  console.error("❌ Invalid Clerk ID. Clerk IDs start with 'user_'");
  process.exit(1);
}

makeAdmin(clerkId, role);

