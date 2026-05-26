import { v2 as cloudinary } from "cloudinary";

const configured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (configured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

/** Upload a base64 data URL to Cloudinary and return the secure URL.
 *  Falls back to returning the original string if Cloudinary is not configured. */
export async function uploadImage(dataUrl: string): Promise<string> {
  if (!configured || !dataUrl.startsWith("data:image/")) return dataUrl;
  const result = await cloudinary.uploader.upload(dataUrl, { folder: "smilemaker" });
  return result.secure_url;
}

/** Upload any base64 entries in an array; leave non-base64 strings (URLs) unchanged. */
export async function uploadImages(images: string[]): Promise<string[]> {
  return Promise.all(images.map((img) => uploadImage(img)));
}
