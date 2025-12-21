import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check Cloudinary configuration
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.error("[Banner Upload] Cloudinary configuration missing");
      return NextResponse.json(
        { error: "Image upload service not configured" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "File must be a JPEG, PNG, GIF, or WebP image" },
        { status: 400 }
      );
    }

    // Validate file size (10MB max for banners)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "Image size must be less than 10MB" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Convert buffer to base64 data URI
    const base64String = buffer.toString("base64");
    const dataUri = `data:${file.type};base64,${base64String}`;

    // Upload to Cloudinary with banner-specific settings
    // Banners are wider, so we use a different aspect ratio
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "banners",
      resource_type: "image",
      public_id: `banner_${userId}_${Date.now()}`,
      transformation: [
        {
          width: 1920,
          height: 400,
          crop: "fill",
          gravity: "center",
          quality: "auto",
          fetch_format: "auto",
        },
      ],
      overwrite: false,
    });

    return NextResponse.json({ url: result.secure_url });
  } catch (error) {
    console.error("Error uploading banner:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload banner" },
      { status: 500 }
    );
  }
}

