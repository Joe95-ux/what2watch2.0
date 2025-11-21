import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

/**
 * Add a YouTube channel ID to the NOLLYWOOD_CHANNEL_IDS array
 * This updates the lib/youtube-channels.ts file
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelId } = body;

    if (!channelId || typeof channelId !== "string") {
      return NextResponse.json(
        { error: "channelId is required and must be a string" },
        { status: 400 }
      );
    }

    // Validate channel ID format (should start with UC and be 24 characters)
    if (!channelId.match(/^UC[a-zA-Z0-9_-]{22}$/)) {
      return NextResponse.json(
        { error: "Invalid channel ID format. Channel IDs should start with 'UC' and be 24 characters long." },
        { status: 400 }
      );
    }

    // Read the current file
    const filePath = join(process.cwd(), "lib", "youtube-channels.ts");
    const fileContent = await readFile(filePath, "utf-8");

    // Check if channel ID already exists
    if (fileContent.includes(channelId)) {
      return NextResponse.json(
        { error: "Channel ID already exists in the list", message: "Channel ID is already added" },
        { status: 400 }
      );
    }

    // Find the NOLLYWOOD_CHANNEL_IDS array
    const arrayStart = fileContent.indexOf("export const NOLLYWOOD_CHANNEL_IDS = [");
    if (arrayStart === -1) {
      return NextResponse.json(
        { error: "Could not find NOLLYWOOD_CHANNEL_IDS array in file" },
        { status: 500 }
      );
    }

    // Find the closing bracket of the array
    let bracketCount = 0;
    let inArray = false;
    let arrayEnd = -1;

    for (let i = arrayStart; i < fileContent.length; i++) {
      if (fileContent[i] === "[") {
        bracketCount++;
        inArray = true;
      } else if (fileContent[i] === "]") {
        bracketCount--;
        if (inArray && bracketCount === 0) {
          arrayEnd = i;
          break;
        }
      }
    }

    if (arrayEnd === -1) {
      return NextResponse.json(
        { error: "Could not find end of NOLLYWOOD_CHANNEL_IDS array" },
        { status: 500 }
      );
    }

    // Extract the array content
    const arrayContent = fileContent.substring(arrayStart, arrayEnd + 1);
    
    // Check if array is empty or has content
    const hasContent = arrayContent.match(/\[[\s\n]*["']/);
    
    // Add the new channel ID
    let newArrayContent: string;
    if (hasContent) {
      // Add comma and new channel ID before the closing bracket
      const beforeBracket = fileContent.substring(arrayStart, arrayEnd);
      newArrayContent = `${beforeBracket},\n  "${channelId}",\n];`;
    } else {
      // Array is empty, add the first item
      const beforeBracket = fileContent.substring(arrayStart, arrayEnd);
      newArrayContent = `${beforeBracket}\n  "${channelId}",\n];`;
    }

    // Replace the array in the file
    const newFileContent = 
      fileContent.substring(0, arrayStart) + 
      newArrayContent + 
      fileContent.substring(arrayEnd + 1);

    // Write the updated file
    await writeFile(filePath, newFileContent, "utf-8");

    return NextResponse.json({
      success: true,
      message: "Channel ID added successfully. The page will refresh to show the new channel.",
      channelId,
    });
  } catch (error) {
    console.error("Error adding channel ID:", error);
    return NextResponse.json(
      { 
        error: "Failed to add channel ID",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

