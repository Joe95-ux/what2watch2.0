import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { v2 as cloudinary } from "cloudinary";

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
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
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

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "File must be a JPEG, PNG, GIF, or WebP image" },
        { status: 400 }
      );
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "Image size must be less than 5MB" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const base64String = Buffer.from(bytes).toString("base64");
    const dataUri = `data:${file.type};base64,${base64String}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "link_banners",
      resource_type: "image",
      public_id: `link_${userId}_${Date.now()}`,
      transformation: [
        {
          width: 560,
          height: 200,
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
    console.error("Error uploading link banner:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload image" },
      { status: 500 }
    );
  }
}
