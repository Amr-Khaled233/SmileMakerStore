import { v2 as cloudinary } from "cloudinary";
import { randomUUID } from "node:crypto";
import { getImagesCol } from "../db.js";

const cloudinaryConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Parse a "data:image/...;base64,...." URL into a content type + raw bytes.
function parseDataUrl(dataUrl: string): { contentType: string; buffer: Buffer } | null {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) return null;
  return { contentType: match[1], buffer: Buffer.from(match[2], "base64") };
}

/** Persist a base64 data URL and return a URL to serve it from.
 *  - Already-a-URL (existing Cloudinary URLs, /api/images/…, static paths): unchanged.
 *  - Cloudinary configured: upload there (kept for backward compatibility).
 *  - Otherwise: store the image as its own document in MongoDB and return
 *    "/api/images/<id>" which the API serves. */
export async function uploadImage(dataUrl: string): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith("data:image/")) return dataUrl;

  if (cloudinaryConfigured) {
    const result = await cloudinary.uploader.upload(dataUrl, { folder: "smilemaker" });
    return result.secure_url;
  }

  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return dataUrl;
  const id = randomUUID();
  const col = await getImagesCol();
  await col.insertOne({
    _id: id,
    data: parsed.buffer,
    contentType: parsed.contentType,
    createdAt: Date.now(),
  });
  return `/api/images/${id}`;
}

/** Upload any base64 entries in an array; leave non-base64 strings (URLs) unchanged. */
export async function uploadImages(images: string[]): Promise<string[]> {
  return Promise.all(images.map((img) => uploadImage(img)));
}

/** Best-effort removal of a DB-stored image given its "/api/images/<id>" URL.
 *  No-op for Cloudinary URLs / static paths. */
export async function deleteStoredImage(url: string): Promise<void> {
  const match = /^\/api\/images\/([^/?#]+)/.exec(url ?? "");
  if (!match) return;
  const col = await getImagesCol();
  await col.deleteOne({ _id: match[1] });
}
