import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Extract Cloudinary public_id from a secure_url.
 * URL format: https://res.cloudinary.com/cloud/image/upload/v123/folder/id.jpg
 */
function getPublicIdFromUrl(url: string): string | null {
  if (!url || !url.includes("cloudinary.com")) return null;
  const match = url.match(/\/upload\/v\d+\/(.+)\.\w+$/);
  if (!match) return null;
  return match[1];
}

/**
 * Delete an image from Cloudinary by its URL (e.g. when replacing or removing a link banner).
 * No-op if URL is not a Cloudinary URL or config is missing.
 */
export async function deleteByUrl(url: string): Promise<void> {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return;
  }
  const publicId = getPublicIdFromUrl(url);
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  } catch (err) {
    console.error("[Cloudinary] deleteByUrl failed:", err);
  }
}
