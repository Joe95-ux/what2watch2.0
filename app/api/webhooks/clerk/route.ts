import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { headers } from "next/headers";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    // Get the Svix headers for verification
    const headerPayload = await headers();
    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
      return NextResponse.json(
        { error: "Error occurred -- no svix headers" },
        { status: 400 }
      );
    }

    // Get the body
    const payload = await request.json();
    const body = JSON.stringify(payload);

    // Get the webhook secret from environment variables
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("CLERK_WEBHOOK_SECRET is not set");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    // Create a new Svix instance with the webhook secret
    const wh = new Webhook(webhookSecret);

    let evt: any;

    // Verify the payload with the headers
    try {
      evt = wh.verify(body, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      }) as any;
    } catch (err) {
      console.error("Error verifying webhook:", err);
      return NextResponse.json(
        { error: "Error occurred -- webhook verification failed" },
        { status: 400 }
      );
    }

    // Handle the webhook
    const eventType = evt.type;
    const { id, username, first_name, last_name, image_url, email_addresses } = evt.data;

    if (eventType === "user.updated") {
      try {
        // Find the user in the database
        const user = await db.user.findUnique({
          where: { clerkId: id },
          select: { id: true, clerkId: true, username: true, displayName: true },
        });

        if (!user) {
          console.log(`User with clerkId ${id} not found in database, skipping update`);
          return NextResponse.json({ received: true });
        }

        // Check if username changed
        const newUsername = username || null;
        const oldUsername = user.username;

        // Prepare update data
        const updateData: {
          username?: string | null;
          displayName?: string | null;
          avatarUrl?: string | null;
          email?: string;
        } = {};

        // Update username if it changed
        if (newUsername !== oldUsername) {
          // Check if the new username is already taken by another user
          if (newUsername) {
            const existingUser = await db.user.findFirst({
              where: {
                username: newUsername,
              },
              select: { clerkId: true },
            });

            // Only update if username is available or belongs to this user
            if (existingUser && existingUser.clerkId !== id) {
              console.error(
                `Username ${newUsername} is already taken by another user, skipping username update`
              );
              // Don't update username, but still update other fields
            } else {
              updateData.username = newUsername;
            }
          } else {
            // Username was removed in Clerk
            updateData.username = null;
          }
        }

        // Update displayName (use first_name + last_name, not username)
        let newDisplayName: string | null = null;
        if (first_name && last_name) {
          newDisplayName = `${first_name} ${last_name}`;
        } else if (first_name) {
          newDisplayName = first_name;
        } else if (last_name) {
          newDisplayName = last_name;
        }
        
        if (newDisplayName !== user.displayName) {
          updateData.displayName = newDisplayName;
        }

        // Update avatar if provided
        if (image_url !== undefined) {
          updateData.avatarUrl = image_url || null;
        }

        // Update email if provided
        if (email_addresses && email_addresses.length > 0) {
          const primaryEmail = email_addresses.find(
            (email: any) => email.id === evt.data.primary_email_address_id
          ) || email_addresses[0];
          if (primaryEmail?.email_address) {
            updateData.email = primaryEmail.email_address;
          }
        }

        // Only update if there are changes
        if (Object.keys(updateData).length > 0) {
          await db.user.update({
            where: { clerkId: id },
            data: updateData,
          });

          console.log(`Updated user ${id} with changes:`, updateData);
        }
      } catch (error) {
        console.error("Error updating user in database:", error);
        // Don't fail the webhook, just log the error
        return NextResponse.json(
          { error: "Error updating user", details: error instanceof Error ? error.message : "Unknown error" },
          { status: 500 }
        );
      }
    } else if (eventType === "user.created") {
      // Optionally handle user creation if needed
      // This is usually handled during onboarding, but we can sync here too
      try {
        const existingUser = await db.user.findUnique({
          where: { clerkId: id },
        });

        if (!existingUser) {
          // User doesn't exist, create them
          // Construct displayName from first_name and last_name
          let displayName: string | null = null;
          if (first_name && last_name) {
            displayName = `${first_name} ${last_name}`;
          } else if (first_name) {
            displayName = first_name;
          } else if (last_name) {
            displayName = last_name;
          }

          await db.user.create({
            data: {
              clerkId: id,
              email: email_addresses?.[0]?.email_address || "",
              displayName: displayName,
              username: username || null,
              avatarUrl: image_url || null,
            },
          });
          console.log(`Created new user ${id} from webhook`);
        }
      } catch (error) {
        console.error("Error creating user from webhook:", error);
      }
    } else if (eventType === "user.deleted") {
      // Handle user deletion if needed
      try {
        await db.user.delete({
          where: { clerkId: id },
        });
        console.log(`Deleted user ${id} from database`);
      } catch (error) {
        console.error("Error deleting user from webhook:", error);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

